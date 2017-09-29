const fs = require('fs')
const glob = require('glob')
const path = require('path')
const { getFileAsString } = require('./fileManager')
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
			if (!fs.existsSync(filePath))
				throw new Error(`Error in block string with arguments. Undefined file ${filePath} in block ${blockStr}`)
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
			else {
				filePath = path.join(dirname, blockVal)
				if (!fs.existsSync(filePath))
					throw new Error(`Error in block string. Undefined file ${filePath} in block ${blockStr}`)
			}
		}

		return (glueFile(filePath, args, options) || { text: '' }).text
	}
	else 
		return ''
}

let _fileContent = {}
const glueFile = (filePath, params = {}, options = {}) => {
	let content = null
	let originalContent = true
	
	if (filePath) {
		const dirname = path.dirname(filePath)
		content = _fileContent[filePath]
		if (!content) {
			const originalText = getFileAsString(filePath)
			const open = '[<]'
			const close = '[>]'
			const escOpen = escapeRegExp(open)
			const escClose = escapeRegExp(close)
			const ast = getAST(originalText, { open, close })

			originalContent = ast.children.length == 0

			const getContent = originalContent
				? () => originalText
				: (params, options) => ast.reassemble((blockStr) => executeBlock(blockStr, dirname, { open: escOpen, close: escClose }, params, options), options)

			content = {
				getContent,
				originalContent
			}
			_fileContent[filePath] = content
		}
	}
	
	return {
		text: content.getContent(params, options),
		originalContent: content.originalContent
	}
}

/*eslint-disable */
const escapeRegExp = str => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
/*eslint-enable */

const glueAllFiles = (rootPath, options) => {
	_fileContent = {}
	return new Promise(onSuccess => {
		glob(path.join(rootPath, '**/*.*'), { ignore: ['**/*.exe', '**/*.dmg', '**/*.DS_Store'] }, (err, files = []) => {
			files.forEach(f => {
				const fileContent = glueFile(f, null, options)
				if (fileContent && !fileContent.originalContent) {
					fs.writeFileSync(f, fileContent.text)
				}
			})
			onSuccess()
		})	
	})
}

module.exports = {
	glueAllFiles
}






