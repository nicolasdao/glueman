/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const { assert } = require('chai')
const path = require('path')
const { glueAllFiles } = require('../src/glue')
const { copyFolderToDst, getFileAsString } = require('../src/fileManager').promise

const answer_fsdf422 = 
`<!DOCTYPE html>
<html>
<head>
	<title>This is Great!</title>
</head>
<body>
	<nav>
		<div src="./static/img/cool.png">
			<span>Home</span>
		</div>
		<div>
			<span>About</span>
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

			/*eslint-disable */
			const src = path.join(__dirname, './dummy/src')
			const dst = path.join(__dirname, './dummy/dst')
			/*eslint-enable */
			return copyFolderToDst(src, dst, { silent: true })
				.then(({ dst }) => glueAllFiles(dst, { indent: true }))
				.then(() => {
					return getFileAsString(path.join(dst, '/index.html'))
						.then(v => assert.equal(v, answer_fsdf422))
				})
		})))
