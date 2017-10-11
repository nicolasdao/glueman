#!/usr/bin/env node
/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

'use strict'

const program = require('commander')
const readline = require('readline')
const path = require('path')
require('colors')
const { glueAllFiles } = require('./src/glue')
const { copyFolderToDst, writeToFile, getFileAsString, watchFolder } = require('./src/fileManager').promise


const askQuestion = (question) => {
	const rl = readline.createInterface({
		/*eslint-disable */
		input: process.stdin,
		output: process.stdout
		/*eslint-enable */
	})
	return (new Promise(resolve => rl.question(question, resolve)))
		.then(answer => {
			rl.close()
			return answer
		})
}

program
	.version('1.0.0')
	.command('init')
	.usage(`: Helps create(or override) a ${'.gluerc.json'.bold.italic} file.`.cyan)
	.action(() => {
		askQuestion('What\'s your source folder? '.cyan)
			.then(answer => Object.assign({}, { src: answer || '' }))
			.then(rc => askQuestion('What\'s your destination folder? '.cyan)
				.then(answer => Object.assign({}, rc || {}, { dst: answer || '' })))
			.then(rc => {
				const content = JSON.stringify(rc, null, '\t')
				/*eslint-disable */
				writeToFile(path.join(process.cwd(), '.gluerc.json'), content)
				/*eslint-enable */
			})
	})

program
	.command('run [src] [dst]')
	.usage(`: Glues all your 'src' files into the 'dst' folder. Glues only once. To automatically re-glue the 'src' into 'dst', use the ${'glue start [src] [dst]'.bold.italic} command.`.cyan)
	.action((src, dst) => {
		(src && dst 
			? 	Promise.resolve({ src, dst }) 
			/*eslint-disable */
			: 	getFileAsString(path.join(process.cwd(), '.gluerc.json'))
				/*eslint-enable */
				.then(
					data => data ? JSON.parse(data) : {},
					() => ({})
				))
			.then(({ src, dst }) => {
				if (!src || !dst) {
					console.log('Missing required \'src\' and \'dst\' arguments. Define the arguments explicitly, or define them inside a \'.gluerc.json\' file (this file can be created with the \'glue init\' command).'.red)
					/*eslint-disable */
				process.exit()
				/*eslint-enable */
				}

				copyFolderToDst(src, dst, { silent: true, deleteDst: true })
					.then(({ src, dst }) => glueAllFiles(dst, { indent: true, getSrcFile: f => f ? f.replace(dst, src) : '' }))
			})
	})

program
	.command('start [src] [dst]')
	.usage(': Automatically glues all your \'src\' files into the \'dst\' folder each time a change is any file of the \'src\' folder is detected.'.cyan)
	.action((src, dst) => {
		(src && dst 
			? 	Promise.resolve({ src, dst }) 
			/*eslint-disable */
			: 	getFileAsString(path.join(process.cwd(), '.gluerc.json'))
				/*eslint-enable */
				.then(
					data => data ? JSON.parse(data) : {},
					() => ({})
				))
			.then(({ src, dst }) => {
				if (!src || !dst) {
					console.log('Missing required \'src\' and \'dst\' arguments. Define the arguments explicitly, or define them inside a \'.gluerc.json\' file (this file can be created with the \'glue init\' command).'.red)
					/*eslint-disable */
				process.exit()
				/*eslint-enable */
				}

				// One-liner for current directory, ignores .dotfiles
				// const listener = chokidar.watch(src)
				// listener.on('ready', () => {
				// 	console.log(`READY FOR CHANGES`)
				// 	listener.on('all', (event, path) => {
				// 		console.log(event, path)
				// 	})
				// })
				
				copyFolderToDst(src, dst, { silent: true, deleteDst: true })
					.then(({ src, dst }) => glueAllFiles(dst, { indent: true, getSrcFile: f => f ? f.replace(dst, src) : '' })
						.then(
							dstFiles => {
								const getSrcFile = f => f ? f.replace(dst, src) : ''
								let memoizedFiles = (dstFiles || []).map(f => ({
									srcFile: getSrcFile(f.file),
									dstFile: f.file,
									srcContent: f.srcContent,
									dstContent: f.dstContent
								}))
								dstFiles = null // delete that big object to prevent memory leak.
								console.log(`Listening to source folder ${src.italic.bold}.`.green)
								console.log(`Re-gluing destination ${dst.italic.bold} automatically.`.green)

								// Start watching files
								return watchFolder(src, null, (e,f) => {
									if (e == 'add' || e == 'unlink' || e == 'addDir' || e == 'unlinkDir') { // need to re-copy/paste all src to dst
										if (e == 'add')
											console.log(`New file ${f.italic.bold} successfully added.`.cyan)
										else if (e == 'unlink')
											console.log(`Deletion of file ${f.italic.bold} successful.`.cyan)
										else if (e == 'addDir')
											console.log(`New folder ${f.italic.bold} successfully added.`.cyan)
										else if (e == 'unlinkDir')
											console.log(`Deletion of folder ${f.italic.bold} successful.`.cyan)

										const start = Date.now()
										copyFolderToDst(src, dst, { silent: true, deleteDst: true })
											.then(({ src, dst }) => glueAllFiles(dst, { indent: true, getSrcFile: f => f ? f.replace(dst, src) : '' }))
											.then(
												dstFiles => {
													memoizedFiles = (dstFiles || []).map(f => ({
														srcFile: getSrcFile(f.file),
														dstFile: f.file,
														srcContent: f.srcContent,
														dstContent: f.dstContent
													}))
													dstFiles = null // delete that big object to prevent memory leak.
													console.log(`Re-gluing operation done in ${Date.now() - start} ms.`.cyan)
												},
												err => {
													console.log('Failed to glue files from source folder into destination folder:'.red)
													console.log(err.message.red)
												})
									}
									else if (e == 'change') { // just a file change
										let existingFile = memoizedFiles.find(x => x.srcFile == f)
										if (!existingFile)
											console.log(`File ${f.italic.bold} can't be found in memory. Can't glue it into destination.`.red)
										else {
											const start = Date.now()
											getFileAsString(f)
												.then(content => {
													if (existingFile.srcContent != content) {
														console.log(`Change to file ${f.italic.bold} successful.`.cyan)

														existingFile.srcContent = content // update memoizedFiles with the new content 
														glueAllFiles(memoizedFiles, { indent: true, getSrcFile: getSrcFile })
															.then(
																dstFiles => {
																	memoizedFiles = (dstFiles || []).map(f => ({
																		srcFile: getSrcFile(f.file),
																		dstFile: f.file,
																		srcContent: f.srcContent,
																		dstContent: f.dstContent
																	}))
																	dstFiles = null // delete that big object to prevent memory leak.
																	console.log(`Re-gluing operation done in ${Date.now() - start} ms.`.cyan)
																},
																err => {
																	console.log('Failed to glue files from source folder into destination folder:'.red)
																	console.log(err.message.red)
																})
													}
												})
										}
									}
								})
							},
							err => {
								console.log('Failed to glue files from source folder into destination folder:'.red)
								console.log(err.message.red)
							}))
			})
	})

/*eslint-disable */
program.parse(process.argv)
/*eslint-enable */




