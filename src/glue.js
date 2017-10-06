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
 * @param  {String} 	filePath 				Absolute path of the file.
 * @param  {Object} 	params   				Parameters in case the file contains other 'value' templates. Example: If 'filePath' 
 *                               				contains a template as such: <glue.somevar/>, and if params = { somevar:'hello' }, 
 *                               			 	then <glue.somevar/> will be replaced by 'hello' in the content of 'filePath'
 * @param  {Object} 	options					Options that need to be passed to the 'reassemble' function of the AST object.
 * @param  {Function} 	options.transform		Function that takes a single String argument (reassembled child) and return a String.
 * @param  {Boolean} 	options.indent 			Maintain indentation for each reinjected reassembled child.
 * @return {Object}     output
 * @return {String}     output.text 			Reconstructed content for file 'filePath'
 * @return {Boolean}    output.originalContent  Indicated whether or not the reconstructed file had to be reconstructed (false) or hadn't(true)
 *                                              which means that the original content of located at 'filePath' didn't contain any references to
 *                                              any templates.
 */
const glueFile = (filePath, params = {}, options = {}) => {
	if (!filePath)
		throw new Error('\'filePath\' is required.')
	
	const dirname = path.dirname(filePath)
	
	return Promise.resolve(_fileContent[filePath])
		.then(content => {
			let originalContent = true

			if (!content) {
				const open = /<glue(.*?)>/
				const close = /<\/glue>|\/>/

				return getFileAsString(filePath)
					.then(originalText => {
						const ast = getAST(originalText, { open, close })

						originalContent = ast.children.length == 0

						const getContent = originalContent
							? () => Promise.resolve(originalText)
							: (params, options) => ast.reassemble((blockStr) => {
								const { attr, content:c } = getAttributesAndContent(blockStr)
								return replaceTemplate(attr, c, dirname, params, options)
							}, options)

						content = {
							getContent,
							originalContent
						}
						_fileContent[filePath] = content

						return content.getContent(params, options)
							.then(text => ({
								text,
								originalContent: content.originalContent
							}))
					})
			}
		
			return content.getContent(params, options)
				.then(text => ({
					text,
					originalContent: content.originalContent
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

const glueAllFiles = (rootPath, options) => {
	_fileContent = {}
	const ignoreList = (ignore || []).map(i => path.join('**',i))
	return getAllFilesInFolder(rootPath, ignoreList)
		.then(files => Promise.all(files.map(f => 
			glueFile(f, null, options).then(fileContent => {
				if (fileContent && !fileContent.originalContent) 
					return writeToFile(f, fileContent.text)
			}))))
}

module.exports = {
	glueAllFiles,
	removeDelimiters
}






