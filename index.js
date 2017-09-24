const { glueAllFiles } = require('./src/glue')
const { copyFolderToDst } = require('./src/fileManager')

/*eslint-disable */
const src = process.argv[2]
const dst = process.argv[3]
/*eslint-enable */

copyFolderToDst(src, dst)
	.then(dst => glueAllFiles(dst))