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
 * @param  {Object} 	options						Options that need to be passed to the 'reassemble' function of the AST object.
 * @param  {Function} 	options.transform			Function that takes a single String argument (reassembled child) and return a String.
 * @param  {Boolean} 	options.indent 				Maintain indentation for each reinjected reassembled child.
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
				const open = /<glue(.*?)>/
				const close = /<\/glue>|\/>/
				const openStartWith = '<glue'

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
								ast = getAST(originalText, { open, close })
								isOriginalContent = ast.children.length == 0
							}
							else
								isOriginalContent = true

							const getContent = isOriginalContent
								? () => Promise.resolve(originalText)
								: (params, options) => ast.reassemble((blockStr) => {
									const { attr, content:c } = getAttributesAndContent(blockStr)
									return replaceTemplate(attr, c, dirname, params, options)
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
 * Gets the attributes as well as the content of a string template. Example:
 * '<glue src="./hello/path.html">Hello World</glue>' -> { attr: ' src="./hello/path.html"', content: 'Hello World' }
 *   
 * @param  {String} s e.g. '<glue src="./hello/path.html">Hello World</glue>'
 * @return {Object}   e.g. { attr: ' src="./hello/path.html"', content: 'Hello World' }
 */
const getAttributesAndContent = s => {
	let attr = null
	let content = null
	if (s) {
		attr = s.match(/^<glue(.*?)>/)[1]
		const skip = `<glue${attr}>`.length
		if (attr.match(/\/$/))
			attr = attr.slice(0, -1)
		else 
			content = s.slice(skip, -7) // -7 because </glue> is 7 characters long
	}

	return { attr, content }
}

/*eslint-disable */
const escapeRegExp = str => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
/*eslint-enable */

const glueAllFiles = (arg, options) => {
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
					return { file: f, content:fileContent.text, original: fileContent.originalContent }
				}))))
	}
	// We only focus on a specific list of files for which we already know the existing content.
	else if (arg.length != undefined) { 
		if (arg.every(x => x.dstFile && x.content && x.original)) {
			return Promise.all(arg.map(a => 
				glueFile(a.dstFile, null, Object.assign({ original: a.original, content: a.content }, options)).then(fileContent => {
					if (fileContent && a.content != fileContent.text)
						writeToFile(a.dstFile, fileContent.text)
					return { file: a.dstFile, content: fileContent.text, original: fileContent.originalContent }
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






