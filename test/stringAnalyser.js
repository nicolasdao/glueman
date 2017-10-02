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
describe('stringAnalyser', () => 
	describe('#getAST: 01', () => 
		it(`Should extract an abstract syntax tree based on a custom pair of opening and closing string delimiters.`, () => {
			/*eslint-enable */
			const text = 'This is <<the world <<of <<tomorrow>> <<where <<the birds and the elephants>>>> can >> fly>>. We\'re very excited to move >> forward. <<Another day <<another <<story>>>>'
			
			const ast = getAST(text, { open: '<<', close: '>>' })

			assert.equal(typeof(ast), 'object', 'getAST should return an object in any cases.')
			assert.isOk(ast.children, 'The \'children\' property of \'ast\' should exist.')
			assert.isOk(ast.children.length != undefined, 'The \'children\' property of \'ast\' should always be an non-nullable array.')
			assert.equal(ast.children.length, 2, '\'ast\' should have two children.')

			const ast_01 = ast.children[0]
			assert.isOk(ast_01.children, 'The \'children\' property of \'ast_01\' should exist.')
			assert.isOk(ast_01.children.length != undefined, 'The \'children\' property of \'ast_01\' should always be an non-nullable array.')
			assert.equal(ast_01.children.length, 1, '\'ast_01\' should have single child.')

			const ast_01_child_01 = ast_01.children[0]
			assert.isOk(ast_01_child_01.children, 'The \'children\' property of \'ast_01_child_01\' should exist.')
			assert.isOk(ast_01_child_01.children.length != undefined, 'The \'children\' property of \'ast_01_child_01\' should always be an non-nullable array.')
			assert.equal(ast_01_child_01.children.length, 2, '\'ast_01_child_01\' should have two children.')

			const ast_01_child_01_child_01 = ast_01_child_01.children[0]
			assert.equal(ast_01_child_01_child_01.text, '<<tomorrow>>')
			assert.isOk(ast_01_child_01_child_01.children, 'The \'children\' property of \'ast_01_child_01_child_01\' should exist.')
			assert.isOk(ast_01_child_01_child_01.children.length != undefined, 'The \'children\' property of \'ast_01_child_01_child_01\' should always be an non-nullable array.')
			assert.equal(ast_01_child_01_child_01.children.length, 0, '\'ast_01_child_01_child_01\' shouldn\'t have any children.')

			const ast_01_child_01_child_02 = ast_01_child_01.children[1]
			assert.isOk(ast_01_child_01_child_02.children, 'The \'children\' property of \'ast_01_child_01_child_02\' should exist.')
			assert.isOk(ast_01_child_01_child_02.children.length != undefined, 'The \'children\' property of \'ast_01_child_01_child_02\' should always be an non-nullable array.')
			assert.equal(ast_01_child_01_child_02.children.length, 1, '\'ast_01_child_01_child_02\' should have one child.')

			const ast_02 = ast.children[1]
			assert.isOk(ast_02.children, 'The \'children\' property of \'ast_02\' should exist.')
			assert.isOk(ast_02.children.length != undefined, 'The \'children\' property of \'ast_02\' should always be an non-nullable array.')
			assert.equal(ast_02.children.length, 1, '\'ast_02\' should have single child.')

			const ast_02_child_01 = ast_02.children[0]
			assert.equal(ast_02_child_01.text, '<<story>>')
			assert.isOk(ast_02_child_01.children, 'The \'children\' property of \'ast_02_child_01\' should exist.')
			assert.isOk(ast_02_child_01.children.length != undefined, 'The \'children\' property of \'ast_02_child_01\' should always be an non-nullable array.')
			assert.equal(ast_02_child_01.children.length, 0, '\'ast_02_child_01\' shouldn\'t have any children.')
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#getAST: 02', () => 
		it(`Should extract an abstract syntax tree based on a custom pair of opening and closing string delimiters.`, () => {
			/*eslint-enable */
			const text = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>This is Great!</title>
			</head>
			<body>
				[<]./nav.html({
					"arg": {
						"root":"."
					}
				})[>]
				<h1>Hello World</h1>
			</body>
			</html>`

			const v = 
				`[<]./nav.html({
					"arg": {
						"root":"."
					}
				})[>]`

			const ast = getAST(text, { open: '[<]', close: '[>]' })
			assert.equal(ast.children.length, 1, '\'ast.children\' should contain a single child.')
			assert.equal(ast.children[0].text, v, '\'ast.children[0].text\' is not equal to the expected value.')
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#getAST: 03', () => 
		it(`Should be able to identify the code block indentation`, () => {
			/*eslint-enable */
			const text = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>This is Great!</title>
			</head>
			<body>
				[<]./nav.html({
					"arg": {
						"root":"."
					}
				})[>]
				<h1>Hello World</h1>
			</body>
[<]Hello[>]
   [<]World[>]
			<p>[<]I'm nic[>]<p>
			</html>`

			const ast = getAST(text, { open: '[<]', close: '[>]' })
			assert.equal(ast.children.length, 4, '\'ast.children\' should contain two children.')
			assert.equal(ast.children[0].indent, '				', '\'ast.children[0].indent\' is not equal to the expected value.')
			assert.equal(ast.children[1].indent, '', '\'ast.children[1].indent\' is not equal to the expected value.')
			assert.equal(ast.children[2].indent, '   ', '\'ast.children[2].indent\' is not equal to the expected value.')
			assert.equal(ast.children[3].indent, '			', '\'ast.children[3].indent\' is not equal to the expected value.')
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#reassemble: 01', () => 
		it(`Should be able to rebuild the original text.`, () => {
			/*eslint-enable */
			const text = 'This is <<the world <<of <<tomorrow>> <<where <<the birds and the elephants>>>> can >> fly>>. We\'re very excited to move >> forward. <<Another day <<another <<story>>>>'
			const ast = getAST(text, { open: '<<', close: '>>' })

			const text2 = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>This is Great!</title>
			</head>
			<body>
				[<]./nav.html({
					"arg": {
						"root":"."
					}
				})[>]
				<h1>Hello World</h1>
			</body>
			</html>`
			const ast2 = getAST(text2, { open: '[<]', close: '[>]' })
			
			return Promise.all([ast.reassemble(), ast2.reassemble()])
				.then(values => {
					assert.equal(values[0], text, '\'reassemble\' should rebuild the exact same string as the origin where the AST is from.')
					assert.equal(values[1], text2, '\'reassemble\' should rebuild the exact same HTML as the origin where the AST is from.')
				})
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
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
						"content": "<div>${open}../../hello.html${close}</div>"
					}
				})${close}
				${open}${open}<h1>Hello World<h1>${close}
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
				${open}
				<p>We use the ${open} to fuck around, and then even more ${open} ${open}</p>
			</body>
			</html>`

			const ast = getAST(text, { open: open, close: close })
			const transform = s => s.indexOf(`${open}./`) == 0 ? '<h1>Hello Yes</h1>' : ''
			
			return ast.reassemble(transform)
				.then(value => {
					assert.equal(value, answer, '\'reassemble\' should rebuild the HTML based on the \'tranform\' rule.')
				})
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#reassemble: 03', () => 
		it(`Should be able to rebuild the AST in a different way than the original source, while preserving indentation.`, () => {
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
						"content": "<div>${open}../../hello.html${close}</div>"
					}
				})${close}
				${open}${open}<h1>Hello World<h1>${close}
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
				<h1>Hello</h1>
				<h1>Yes</h1>
				${open}
				<p>We use the ${open} to fuck around, and then even more ${open} ${open}</p>
			</body>
			</html>`

			const ast = getAST(text, { open: open, close: close })
			const transform = s => s.indexOf(`${open}./`) == 0 
				? '<h1>Hello</h1>\n<h1>Yes</h1>' 
				: ''

			return ast.reassemble(transform, { indent: true })
				.then(value => {
					assert.equal(value, answer, '\'reassemble\' should rebuild the HTML based on the \'tranform\' rule.')
				})
		})))


