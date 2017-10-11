/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const path = require('path')
const { files:ignore } = require('./ignore.json')
const { getFileAsString, getAllFilesInFolder, writeToFile, fileExists } = require('./fileManager').promise
const { getAST, removeDelimiters, getAttributes, getPropertyValue, topLevelXmlStrToObject } = require('./stringAnalyser')

const replaceTemplate = (attrStr, contantStr, dirname, params, options) => {
	if (attrStr) {
		const attrProps = ((attrStr.trim() + ' ').match(/^\.(.*?)\s/) || [null, null])[1]
		if (attrProps) // this is a property
			return Promise.resolve(params ? getPropertyValue(params, attrProps) : '')
		else { // this is a reference to a template file
			const attr = getAttributes(attrStr)
			if (attr.src) {
				const contentProps = topLevelXmlStrToObject(contantStr)
				const args = Object.assign({}, attr, contentProps)
				const filePath = path.join(dirname, attr.src)
				return fileExists(filePath)
					.then(
						() => glueFile(filePath, args, options).then(c => (c || { text: '' }).text),
						() => { throw new Error(`Error in block string. Undefined file ${filePath} in attributes ${attrStr}`) })
			}
			else
				return Promise.resolve('')
		}
	}
	else 
		return Promise.resolve('')
}

let _fileContent = {}
/**
 * Gets the text content of a file located at 'filePath'. If that content contains other references to other templates, then
 * those template will also be resolved so that the text content is complete. The output of this method is not just a string 
 * representing the text content, it is an object containing that text, as well as a boolean indicating whether or not that 
 * text is the original text of the 'filePath' or if it had to be modified because it contained other templates that had to be
 * glued (i.e. resolved) to.
 * 
 * @param  {String} 	filePath 					Absolute path of the file.
 * @param  {Object} 	params   					Parameters in case the file contains other 'value' templates. Example: If 'filePath' 
 *                               					contains a template as such: <glue.somevar/>, and if params = { somevar:'hello' }, 
 *                               			 		then <glue.somevar/> will be replaced by 'hello' in the content of 'filePath'
 * @param  {Object} 	options						Options that need to be passed to the 'glue' function of the AST object.
 * @param  {Function} 	options.transform			Function that takes a 3 String argument (open, body (i.e. glued children), close) and return a String.
 * @param  {Boolean} 	options.indent 				Maintain indentation for each reinjected glued child.
 * @param  {Boolean} 	options.original 			Original content from 'filePath'
 * @return {Object}     output
 * @return {String}     output.text 				Reconstructed content for file 'filePath'
 * @return {String}     output.originalContent 		Original content from file 'filePath'
 * @return {Boolean}    output.isOriginalContent  	Indicated whether or not the reconstructed file had to be reconstructed (false) or hadn't(true)
 *                                                 	which means that the original content of located at 'filePath' didn't contain any references to
 *                                                  any templates.
 */
const glueFile = (filePath, params = {}, options = {}) => {
	if (!filePath)
		throw new Error('\'filePath\' is required.')
	
	const dirname = path.dirname(filePath)
	
	return Promise.resolve(_fileContent[filePath])
		.then(content => {
			let isOriginalContent = true

			if (!content) {
				const open = [/<glue(.*?)\/>/, /<glue(.*?)>/]
				const close = ['', /<\/glue>/]
				const openStartWith = '<glue'

				const srfFile = options.getSrcFile ? options.getSrcFile(filePath) : ''
				return (options.original ? Promise.resolve(options.original) : getFileAsString(filePath))
					.then(originalText => {
						const cachedContentHasNotChanged = options.content && options.content == options.original
						if (cachedContentHasNotChanged) {
							content = {
								getContent: () => Promise.resolve(options.content),
								originalContent: options.original,
								isOriginalContent: true
							}
						}
						else {
							let ast
							if (originalText.indexOf(openStartWith) >= 0) {
								ast = getAST(originalText, open, close, Object.assign( { filename: srfFile }, options))
								isOriginalContent = ast.length == 0
							}
							else
								isOriginalContent = true

							const getContent = isOriginalContent
								? () => Promise.resolve(originalText)
								: (params, options) => ast.glue(({ open, body }) => {
									const attr = getGlueAttributeString(open)
									return replaceTemplate(attr, body, dirname, params, options)
								}, options)

							content = {
								getContent,
								originalContent: originalText,
								isOriginalContent
							}
						}
						_fileContent[filePath] = content

						return content.getContent(params, options)
							.then(text => ({
								text,
								originalContent: content.originalContent,
								isOriginalContent: content.isOriginalContent
							}))
					})
			}
		
			return content.getContent(params, options)
				.then(text => ({
					text,
					originalContent: content.originalContent,
					isOriginalContent: content.isOriginalContent
				}))
		})
}

/**
 * Gets the attributes of a string template. Example:
 * '<glue src="./hello/path.html">' -> ' src="./hello/path.html"'
 *   
 * @param  {String} s e.g. '<glue src="./hello/path.html">'
 * @return {String}   e.g. ' src="./hello/path.html"'
 */
const getGlueAttributeString = s => {
	let attr = null
	if (s) {
		attr = s.match(/^<glue(.*?)>/)[1]
		if (attr.match(/\/$/))
			attr = attr.slice(0, -1)
	}

	return attr
}

/*eslint-disable */
const escapeRegExp = str => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
/*eslint-enable */

const glueAllFiles = (arg, options={}) => {
	_fileContent = {}
	if (!arg)
		throw new Error('arg is required.')
	// Need to load all files in a folder and overide them, even if they haven't changed.
	if (typeof(arg) == 'string') { 
		const rootPath = arg
		const ignoreList = (ignore || []).map(i => path.join('**',i))
		return getAllFilesInFolder(rootPath, ignoreList)
			.then(files => Promise.all(files.map(f => 
				glueFile(f, null, options).then(fileContent => {
					if (fileContent && !fileContent.isOriginalContent) 
						writeToFile(f, fileContent.text)
					return { file: f, dstContent: fileContent.text, srcContent: fileContent.originalContent }
				}))))
	}
	// We only focus on a specific list of files for which we already know the existing content.
	else if (arg.length != undefined) { 
		if (arg.every(x => x.dstFile != undefined && x.dstContent != undefined && x.srcContent != undefined)) {
			return Promise.all(arg.map(a => 
				glueFile(a.dstFile, null, Object.assign({ original: a.srcContent, content: a.dstContent }, options)).then(fileContent => {
					if (fileContent && a.dstContent != fileContent.text)
						writeToFile(a.dstFile, fileContent.text)
					return { file: a.dstFile, dstContent: fileContent.text, srcContent: fileContent.originalContent }
				})
			))
		}
		else 
			throw new Error('Invalid argument \'arg\'. If \'arg\' is an array, each item must be an object containing those three properties: \'dstFile\', \'content\' and \'original\'.')
	}
	else 
		throw new Error('Invalid argument \'arg\'. \'arg\' can only be a string representing a folder\'s path or an array of object with at least three properties \'dstFile\', \'content\' and \'original\'.')
}

module.exports = {
	glueAllFiles,
	removeDelimiters
}






