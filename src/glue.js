const path = require('path')
const { files:ignore } = require('./ignore.json')
const { getFileAsString, getAllFilesInFolder, writeToFile, fileExists } = require('./fileManager').promise
const { getAST, removeDelimiters, getAttributes } = require('./stringAnalyser')


const executeBlock = (attrStr, contantStr, dirname, params, options) => {
	if (attrStr) {
		const attr = getAttributes(attrStr)
		if (attr.src) {
			const filePath = path.join(dirname,attr.src)
			return fileExists(filePath)
				.then(
					() => glueFile(filePath, null, options).then(c => (c || { text: '' }).text),
					() => { throw new Error(`Error in block string. Undefined file ${filePath} in block ${blockStr}`) })
		}
		else
			return Promise.resolve('')
	}
	else 
		return Promise.resolve('')
}

let _fileContent = {}
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
								const a = getAST(blockStr, { open, close }).children[0]
								const blockAttrString = removeDelimiters(a.open, /^<glue/, /\/>|>$/)
								const closing = new RegExp(escapeRegExp(a.close) + '$')
								const blockContent = a.text.replace(a.open, '').replace(closing, '')
								return executeBlock(blockAttrString, blockContent, dirname, params, options)
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






