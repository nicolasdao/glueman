/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const { assert } = require('chai')
const path = require('path')
const { getAST } = require('../src/stringAnalyser')
const { glueAllFiles } = require('../src/glue')
const { copyFolderToDst, getFileAsString } = require('../src/fileManager')

const answer_fsdf422 = 
`<!DOCTYPE html>
<html>
<head>
	<title>This is Great!</title>
</head>
<body>
	<nav>
		<div src="./static/img/cool.png">
			Hello
		</div>
		<div>
			World
		</div>
	</nav>
	<h1>Hello World</h1>
</body>
</html>`

/*eslint-disable */
describe('glue', () => 
	describe('#glueAllFiles: 01', () => 
		it(`Should be able to glue all files together.`, () => {
			/*eslint-enable */

			const src = path.join(__dirname, './dummy/src')
			const dst = path.join(__dirname, './dummy/dst')
			return copyFolderToDst(src, dst, { silent: true })
			.then(dst => glueAllFiles(dst, { indent: true }))
			.then(() => {
				assert.equal(getFileAsString(path.join(dst, '/index.html')), answer_fsdf422)
			})
		})))
