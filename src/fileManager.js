const fs = require('fs')
const path = require('path')
const { ncp } = require('ncp')
const glob = require('glob')
require('colors')
ncp.limit = 16 // nbr of concurrent process allocated to copy your files

//////////////////////////////////////////////////////////////////////////////////////////////////////
///
///												GENERAL
///
//////////////////////////////////////////////////////////////////////////////////////////////////////

const getPath = p => p 
	? p.indexOf(path.sep) == 0 || p.indexOf('~') == 0
		? p 
		/*eslint-disable */
		: path.join(process.cwd(), p) 
	: process.cwd()
	/*eslint-enable */

//////////////////////////////////////////////////////////////////////////////////////////////////////
///
///												SYNC
///
//////////////////////////////////////////////////////////////////////////////////////////////////////

const createDirSync = dirname => {
	if (!fs.existsSync(dirname))
		fs.mkdirSync(dirname)
}

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

const getFileAsStringSync = filePath => {
	const buf = fs.readFileSync(filePath)
	return buf.toString()
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
///
///										PROMISE
///
//////////////////////////////////////////////////////////////////////////////////////////////////////

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

const copyFolderToDst = (src, dst, options) => {
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

						if (!options || !options.silent)
							console.log(`Files located under ${absSrc} successfully copied under folder ${absDst}`.green)

						// This piece of code seems unecessary, but without it, any subsequent glob call in a chained promise 
						// will only return incomplete results. I can't explain it so far. (Nicolas Dao - 2017/09/29)
						glob(path.join(absDst, '**/*.*'), () => {
							onSuccess(absDst)
						})
					})
				})
		})
	})
}

const fileExists = p => new Promise((onSuccess, onFailure) => fs.exists(p, exists => exists ? onSuccess(p) : onFailure(p)))

const writeToFile = (filePath, stringContent) => new Promise((onSuccess, onFailure) => fs.writeFile(filePath, stringContent, err => 
	err ? onFailure(err) : onSuccess()))

const getFileAsString = filePath => new Promise((onSuccess, onFailure) => 
	fs.readFile(filePath, (err, data) => err ? onFailure(err) : onSuccess(data.toString())))

const getAllFilesInFolder = (folderPath, ignore) => new Promise((onSuccess, onFailure) => {
	if (!folderPath)
		onFailure('\'folderPath\' is required')
	else
		glob(path.join(folderPath, '**/*.*'), ignore ? { ignore } : {}, (err, files = []) => err ? onFailure(err) : onSuccess(files))	
})

module.exports = {
	sync: {
		copyFolderToDst: copyFolderToDstSync,
		getFileAsString: getFileAsStringSync,
		createDir: createDirSync
	},
	promise: {
		writeToFile,
		copyFolderToDst,
		getFileAsString,
		fileExists,
		getAllFilesInFolder
	}
}