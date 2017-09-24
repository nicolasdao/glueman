/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const { assert } = require('chai')
const { getAST } = require('../src/stringAnalyser')

/*eslint-disable */
describe('glue', () => 
	describe('#reassemble: 02', () => 
		it(`Should be able to rebuild the AST in a different way than the original source.`, () => {
			/*eslint-enable */
			
			const open = '[<]'
			const close = '[>]'

			const text = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>This is Great!</title>
			</head>
			<body>
				${open}./nav.html({
					"arg": {
						"root":".",
						"title": "Super star"
					}
				})${close}
				<p>We use the ${open} to fuck around, and then even more ${open} ${open}</p>
			</body>
			</html>`

			const answer = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>This is Great!</title>
			</head>
			<body>
				<h1>Hello Yes</h1>
				<p>We use the ${open} to fuck around, and then even more ${open} ${open}</p>
			</body>
			</html>`

			const ast = getAST(text, { open: open, close: close })
			//console.log(ast)
			const t = ast.children[0].text
			console.log(t)
			if (t.match(/\)\[>\]$/)) {
				const p = t.match(/\[<\](.*?)\(/)[1]
				console.log(p)
				const args = t.replace(/\[<\]/,'').replace(`${p}(`,'').replace(/\)\[>\]$/, '')
				console.log(JSON.parse(args))
			}

			assert.equal(ast.reassemble(), text, `'reassemble' should rebuild the exact same HTML as the origin where the AST is from.`)
			const transform = s => s.indexOf(`${open}./`) == 0 ? '<h1>Hello Yes</h1>' : ''
			assert.equal(ast.reassemble(transform), answer, `'reassemble' should rebuild the HTML based on the 'tranform' rule.`)
		})))

