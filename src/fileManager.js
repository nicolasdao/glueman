const fs = require('fs')
const path = require('path')
const { ncp } = require('ncp')
require('colors')
ncp.limit = 16 // nbr of concurrent process allocated to copy your files

const createDirSync = dirname => {
	if (!fs.existsSync(dirname))
		fs.mkdirSync(dirname)
}

const createDir = (dirname, cb) => 
	fs.exists(dirname, exists => {
		if (exists)
			cb()
		else
			fs.mkdir(dirname, err => {
				if (err) throw err
				cb()
			})
	})

const getPath = p => p 
	? p.indexOf(path.sep) == 0 || p.indexOf('~') == 0
		? p 
		/*eslint-disable */
		: path.join(process.cwd(), p) 
	: process.cwd()
	/*eslint-enable */

const copyFolderToDstSync = (src, dst) => {
	const absSrc = getPath(src)
	const absDst = getPath(dst)
	if (!fs.existsSync(absSrc)) {
		console.log(`Source folder ${absSrc} does not exist.`.red)
		/*eslint-disable */
		process.exit()
		/*eslint-enable */
	}
	createDirSync(absDst)
	ncp(absSrc, absDst, err => {
		if (err) console.error(JSON.stringify(err).red)
		console.log(`Files located under ${absSrc} successfully copied under folder ${absDst}`.green)
		/*eslint-disable */
		process.exit()
		/*eslint-enable */
	})
}

const copyFolderToDst = (src, dst) => {
	const absSrc = getPath(src)
	const absDst = getPath(dst)
	
	return new Promise(onSuccess => {
		fs.exists(absSrc, (exists) => {
			if (!exists) {
				console.log(`Source folder ${absSrc} does not exist.`.red)
				/*eslint-disable */
				process.exit()
				/*eslint-enable */
			}
			else
				createDir(absDst, () => {
					ncp(absSrc, absDst, err => {
						if (err) {
							console.error(JSON.stringify(err).red)
							/*eslint-disable */
							process.exit()
							/*eslint-enable */
						}

						console.log(`Files located under ${absSrc} successfully copied under folder ${absDst}`.green)
						onSuccess(absDst)
					})
				})
		})
	})

	
}

const getFileAsString = filePath => {
	const buf = fs.readFileSync(filePath)
	return buf.toString()
}

module.exports = {
	copyFolderToDst,
	copyFolderToDstSync,
	getFileAsString
}