const fs = require('fs')
const glob = require('glob')
const path = require('path')
const { getFileAsString } = require('./fileManager')
const { getAST } = require('./stringAnalyser')

let _fileContent = {}
const glueFile = (filePath, options) => {
	let content = null
	let originalContent = true
	
	if (filePath) {
		content = _fileContent[filePath]
		if (!content) {
			let fileText = getFileAsString(filePath)
			const AST = getAST(fileText, { open: '[<]', close: '[>]' })
			if (functions.length > 0) {
				const dirname = path.dirname(filePath)
				const { parentPaths = [] } = (options || {})
				parentPaths.push(filePath)
				functions.forEach(t => {
					const tPath = path.join(dirname, t)
					if (fs.existsSync(tPath)) {
						const tokenContent = parentPaths.some(x => x == tPath) ? '' : glueFile(tPath, { parentPaths })
						if (tokenContent.text) {
							originalContent = false
							const re = new RegExp(`<<${t}>>`, 'g')
							fileText = fileText.replace(re, tokenContent.text)
						}
					}
				})
			}

			content = {
				text: fileText || '',
				originalContent
			}
			_fileContent[filePath] = content
		}
	}

	return content
}

const glueAllFiles = rootPath => {
	_fileContent = {}
	return new Promise(onSuccess => {
		glob(path.join(rootPath, '**/*.*'), { ignore: ['**/*.exe', '**/*.dmg', '**/*.DS_Store'] }, (err, files = []) => {
			files.forEach(f => {
				const fileContent = glueFile(f)
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






