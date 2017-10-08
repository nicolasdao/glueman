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

				copyFolderToDst(src, dst, { silent: true })
					.then(({ dst }) => {
						glueAllFiles(dst, { indent: true })
					})
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

				copyFolderToDst(src, dst, { silent: true })
					.then(({ src, dst }) => glueAllFiles(dst, { indent: true })
						.then(dstFiles => {
							let memoizedFiles = (dstFiles || []).map(f => ({
								srcFile: f.file.replace(dst, src),
								dstFile: f.file,
								original: f.original,
								content: f.content
							}))
							dstFiles = null // delete that big object to prevent memory leak.
							console.log(`Listening to source folder ${src.italic.bold}.`.green)
							console.log(`Re-gluing destination ${dst.italic.bold} automatically.`.green)
							return watchFolder(src, null, (e,f) => {
								console.log(`File ${f.italic.bold} changed.`.cyan)
								const start = Date.now()
								getFileAsString(f)
									.then(content => {
										let existingFile = memoizedFiles.find(x => x.srcFile == f)
										if (!existingFile) {
											console.log(`File ${f.italic.bold} can't be found in memory. Can't glue it into destination.`.red)
											/*eslint-disable */
										process.exit()
										/*eslint-enable */
										}
										existingFile.original = content // update memoizedFiles with the new content 
										glueAllFiles(memoizedFiles, { indent: true })
											.then(dstFiles => {
												memoizedFiles = (dstFiles || []).map(f => ({
													srcFile: f.file.replace(dst, src),
													dstFile: f.file,
													original: f.original,
													content: f.content
												}))
												console.log(`Re-gluing operation done in ${Date.now() - start} ms.`.cyan)
											})
									})
							})}))
			})
	})

/*eslint-disable */
program.parse(process.argv)
/*eslint-enable */




