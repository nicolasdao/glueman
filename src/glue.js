const path = require('path')
const { getFileAsString, getAllFilesInFolder, writeToFile, fileExists } = require('./fileManager').promise
const { getAST } = require('./stringAnalyser')


const executeBlock = (blockStr, dirname, delimiter, params, options) => {
	if (blockStr && delimiter) {
		// open & close should have been regex escaped before
		const { open, close } = delimiter
		const code = blockStr.replace(new RegExp(`^${open}`), '').replace(new RegExp(`${close}$`), '').trim()
		let filePath
		let args
		if (code.match(/\)$/)) { // code contains arguments
			const f = ((code.match(/.*\(/) || [])[0] || '')
			if (!f)
				throw new Error(`Fail to compile block string ${blockStr}`)
			/*eslint-disable */
			filePath = path.join(dirname, f.replace(/[\n|\t]/g, '').replace(/\($/,'').trim()) 
			/*eslint-enable */
			const a = code.replace(f,'').replace(/\)$/,'')
			try {
				args = JSON.parse(a)
			}
			/*eslint-disable */
			catch(err) {
				/*eslint-enable */
				throw new Error(`Parsing error. Failed to JSON parse string ${a} in block ${blockStr}`)
			}
		}
		else {
			const blockVal = code.replace(/[\n|\t]/g, '').trim()
			/*eslint-disable */
			if (blockVal.match(/^args/))	{
				try {
					return params ? (((args) => eval(blockVal))(params) || '') : ''
					/*eslint-enable */
				}
				/*eslint-disable */
				catch(err) {
					/*eslint-enable */
					throw new Error(`Fail to eval expression ${blockVal}`)
				}
			}
			else
				filePath = path.join(dirname, blockVal)
		}

		return fileExists(filePath)
			.then(
				() => glueFile(filePath, args, options).then(c => (c || { text: '' }).text),
				() => { throw new Error(`Error in block string. Undefined file ${filePath} in block ${blockStr}`) })
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
				const open = '[<]'
				const close = '[>]'

				return getFileAsString(filePath)
					.then(originalText => {
						const escOpen = escapeRegExp(open)
						const escClose = escapeRegExp(close)
						const ast = getAST(originalText, { open, close })

						originalContent = ast.children.length == 0

						const getContent = originalContent
							? () => Promise.resolve(originalText)
							: (params, options) => ast.reassemble((blockStr) => executeBlock(blockStr, dirname, { open: escOpen, close: escClose }, params, options), options)

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
	return getAllFilesInFolder(rootPath, ['**/*.exe', '**/*.dmg', '**/*.DS_Store'])
		.then(files => Promise.all(files.map(f => 
			glueFile(f, null, options).then(fileContent => {
				if (fileContent && !fileContent.originalContent) 
					return writeToFile(f, fileContent.text)
			}))))
}

module.exports = {
	glueAllFiles
}






