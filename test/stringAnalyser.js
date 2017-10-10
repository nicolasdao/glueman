/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const { assert } = require('chai')
const { 
	getAST, 
	removeDelimiters, 
	getAttributes, 
	getPropertyValue, 
	topLevelXmlStrToObject, 
	getLinesData } = require('../src/stringAnalyser')

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#getPropertyValue', () => 
		it(`Should return an object's property based on a string representing the property names.`, () => {
			/*eslint-enable */
			assert.equal(getPropertyValue({ a: { b: { c: 34 } }, k: 23 }, 'a.b.c'), 34)
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#getLinesData: 01', () => 
		it(`Should find all details of the position of all new lines in a string.`, () => {
			/*eslint-enable */
			const text = `Hello
				My name is nic
				and I'm testing this function
				   while messing up with the indentation.`

			const linesData = getLinesData(text)
			assert.equal(linesData.length, 4, 'There should be 3 new lines detected.')
			assert.equal(text.slice(0, linesData[1].pos), 'Hello', 'The first line does not match.')
			assert.equal(text.slice(linesData[1].pos+1, linesData[2].pos), '				My name is nic', 'The second line does not match.')
			assert.equal(linesData[0].indentation, '', 'Wrong first line indentation')
			assert.equal(linesData[1].indentation, '				', 'Wrong second line indentation')
			assert.equal(linesData[2].indentation, '				', 'Wrong third line indentation')
			assert.equal(linesData[3].indentation, '				   ', 'Wrong fourth line indentation')
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#getLinesData: 02', () => 
		it(`Should find the correct line based on any char position.`, () => {
			/*eslint-enable */
			const text = `Hello
				My name is nic
				and I'm testing this function
				   while messing up with the indentation.`

			const linesData = getLinesData(text)
			const pos = text.match(/nic/).index + 2
			const nicLine = linesData.get(pos)
			assert.equal(nicLine.line, 2, `The end of the word 'nic' should be on line 2.`)
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#removeDelimiters', () => 
		it(`Should remove the delimiters from a string.`, () => {
			/*eslint-enable */
			const text = '<glue src="./components/nav.html">Hello World<glue></glue>'
			assert.equal(removeDelimiters(text, /^<glue/, /<\/glue>|\/>$/), ' src="./components/nav.html">Hello World<glue>')
			const text2 = '<glue src="./components/nav.html">'
			assert.equal(removeDelimiters(text2, /^<glue/, /\/>|>$/), ' src="./components/nav.html"')
			const text3 = '<glue src="./components/nav.html"/>'
			assert.equal(removeDelimiters(text3, /^<glue/, /\/>|>$/), ' src="./components/nav.html"')
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#topLevelXmlStrToObject', () => 
		it(`Should convert an XML string to an object whose properties are the top level XML nodes.`, () => {
			/*eslint-enable */
			let text = `
				<menuone>
					<h1>Home</h1>
					<ul>
						<li>Products</li>
						<li>Services</li>
						<li>Vision</li>
					</ul>
				</menuone>
				<menutwo>
					<h1>About</h1>
				</menutwo>
			`

			let answer = {
				menuone: `
	<h1>Home</h1>
	<ul>
		<li>Products</li>
		<li>Services</li>
		<li>Vision</li>
	</ul>
`,
				menutwo: `
	<h1>About</h1>
`
			}

			let val = topLevelXmlStrToObject(text)
			assert.isOk(val)
			assert.equal(val.menuone, answer.menuone)
			assert.equal(val.menutwo, answer.menutwo)
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#getAttributes', () => 
		it(`Should convert a string of attributes to an object with all those attributes.`, () => {
			/*eslint-enable */
			let text = ' src  =\'./folder/index.html\' root=  "./main"'
			let attr = getAttributes(text)
			assert.equal(attr.src, './folder/index.html')
			assert.equal(attr.root, './main')

			text = ' src  =\'./folder/index.html\' root=  "./main" random=\'hello "world"\''
			attr = getAttributes(text)
			assert.equal(attr.src, './folder/index.html')
			assert.equal(attr.root, './main')
			assert.equal(attr.random, 'hello "world"')

			text = ' src  =\'./folder/index.html\' root=  "./main" random=\'hello\'s "world"\''
			assert.throw(() => getAttributes(text), Error, 'Badly formatted attribute string  src  =\'./folder/index.html\' root=  "./main" random=\'hello\'s "world"\'. Error before " character at position 62')
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#getAST: 01', () => 
		it(`Should extract an abstract syntax tree based on a custom pair of opening and closing string delimiters.`, () => {
			/*eslint-enable */
			const text = 'This is <<the world <<of <<tomorrow>> <<where <<the birds and the elephants>>>> can >> fly>>. We\'re very excited to move >> forward. <<Another day <<another <<story>>>>>>'
			
			//const ast = getAST(text, { open: '<<', close: '>>' })
			const ast = getAST(text, '<<', '>>')
			assert.equal(typeof(ast), 'object', 'getAST should return an object in any cases.')
			assert.isOk(ast.length != undefined, 'The \'children\' property of \'ast\' should always be an non-nullable array.')
			assert.equal(ast.length, 2, '\'ast\' should have two children.')

			const ast_01 = ast[0]
			assert.isOk(ast_01.children, 'The \'children\' property of \'ast_01\' should exist.')
			assert.isOk(ast_01.children.length != undefined, 'The \'children\' property of \'ast_01\' should always be an non-nullable array.')
			assert.equal(ast_01.children.length, 1, '\'ast_01\' should have single child.')

			const ast_01_child_01 = ast_01.children[0]
			assert.isOk(ast_01_child_01.children, 'The \'children\' property of \'ast_01_child_01\' should exist.')
			assert.isOk(ast_01_child_01.children.length != undefined, 'The \'children\' property of \'ast_01_child_01\' should always be an non-nullable array.')
			assert.equal(ast_01_child_01.children.length, 2, '\'ast_01_child_01\' should have two children.')

			const ast_01_child_01_child_01 = ast_01_child_01.children[0]
			assert.equal(ast_01_child_01_child_01.body, 'tomorrow')
			assert.isOk(ast_01_child_01_child_01.children, 'The \'children\' property of \'ast_01_child_01_child_01\' should exist.')
			assert.isOk(ast_01_child_01_child_01.children.length != undefined, 'The \'children\' property of \'ast_01_child_01_child_01\' should always be an non-nullable array.')
			assert.equal(ast_01_child_01_child_01.children.length, 0, '\'ast_01_child_01_child_01\' shouldn\'t have any children.')

			const ast_01_child_01_child_02 = ast_01_child_01.children[1]
			assert.isOk(ast_01_child_01_child_02.children, 'The \'children\' property of \'ast_01_child_01_child_02\' should exist.')
			assert.isOk(ast_01_child_01_child_02.children.length != undefined, 'The \'children\' property of \'ast_01_child_01_child_02\' should always be an non-nullable array.')
			assert.equal(ast_01_child_01_child_02.children.length, 1, '\'ast_01_child_01_child_02\' should have one child.')

			const ast_02 = ast[1]
			assert.isOk(ast_02.children, 'The \'children\' property of \'ast_02\' should exist.')
			assert.isOk(ast_02.children.length != undefined, 'The \'children\' property of \'ast_02\' should always be an non-nullable array.')
			assert.equal(ast_02.children.length, 1, '\'ast_02\' should have single child.')

			const ast_02_child_01 = ast_02.children[0]
			assert.equal(ast_02_child_01.body, 'another <<story>>')
			assert.isOk(ast_02_child_01.children, 'The \'children\' property of \'ast_02_child_01\' should exist.')
			assert.equal(ast_02_child_01.children.length, 1, '\'ast_02_child_01\' should have one child.')
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
				`./nav.html({
					"arg": {
						"root":"."
					}
				})`

			const ast = getAST(text, '[<]', '[>]')
			assert.equal(ast.length, 1, '\'ast\' should contain a single child.')
			assert.equal(ast[0].body, v, '\'ast[0].body\' is not equal to the expected value.')
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

			const ast = getAST(text, '[<]', '[>]')
			assert.equal(ast.length, 4, '\'ast.children\' should contain four children.')
			assert.equal(ast[0].line.indentation, '				', '\'ast[0].line.indentation\' is not equal to the expected value.')
			assert.equal(ast[1].line.indentation, '', '\'ast[1].line.indentation\' is not equal to the expected value.')
			assert.equal(ast[2].line.indentation, '   ', '\'ast[2].line.indentation\' is not equal to the expected value.')
			assert.equal(ast[3].line.indentation, '			', '\'ast[3].line.indentation\' is not equal to the expected value.')
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#getAST: 04', () => 
		it(`Should extract an abstract syntax tree based on a custom pair of opening and closing regex delimiters.`, () => {
			/*eslint-enable */
			const text = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>This is Great!</title>
			</head>
			<body>
				<glue src='./nav.html'>
					<p>This is fun</p>
				</glue>
				<glue src="./hello/footer.html"/>
				<h1>Hello World</h1>
			</body>
			</html>`

			const v = 
				`<glue src='./nav.html'>
					<p>This is fun</p>
				</glue>`

			const v2 = 
				'<glue src="./hello/footer.html"/>'

			const ast = getAST(text, [/<glue(.*?)\/>/, /<glue(.*?)>/], ['', /<\/glue>/] )
			assert.equal(ast.length, 2, '\'ast\' should contain two children.')
			assert.equal(ast[0].open, `<glue src='./nav.html'>`, '\'ast[0].open\' is not equal to the expected value.')
			assert.equal(ast[0].body, `\n					<p>This is fun</p>\n				`, '\'ast[0].body\' is not equal to the expected value.')
			assert.equal(ast[0].close, `</glue>`, '\'ast[0].close\' is not equal to the expected value.')
			assert.equal(ast[1].open, `<glue src="./hello/footer.html"/>`, '\'ast[1].open\' is not equal to the expected value.')
			assert.equal(ast[1].body, '', '\'ast[1].body\' is not equal to the expected value.')
			assert.equal(ast[1].close, '', '\'ast[1].close\' is not equal to the expected value.')
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#glue: 01', () => 
		it(`Should be able to rebuild the original text.`, () => {
			/*eslint-enable */
			const text = 'This is <<the world <<of <<tomorrow>> <<where <<the birds and the elephants>>>> can >> fly>>. We\'re very excited to move >> forward. <<Another day <<another <<story>>>>>>'
			const ast = getAST(text, '<<', '>>', { filename: 'text.txt' })

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
			const ast2 = getAST(text2, '[<]', '[>]')
			
			return Promise.all([ast.glue(), ast2.glue()])
				.then(values => {
					assert.equal(values[0], text, '\'glue\' should rebuild the exact same string as the origin where the AST is from.')
					assert.equal(values[1], text2, '\'glue\' should rebuild the exact same HTML as the origin where the AST is from.')
				})
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#glue: 02', () => 
		it(`Should be able to rebuild the AST in a different way than the original source.`, () => {
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
						"root":".",
						"content": "<div>[<]../../hello.html[>]</div>"
					}
				})[>]
				[<]<h1>Hello World<h1>[>]
				<p>We use the to fuck around, and then even more</p>
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
				--
				<p>We use the to fuck around, and then even more</p>
			</body>
			</html>`

			const ast = getAST(text, '[<]', '[>]' )
			const transform = (o,b,c) => b.indexOf('./') == 0 ? '<h1>Hello Yes</h1>' : '--'
			
			return ast.glue(transform)
				.then(value => {
					assert.equal(value, answer, '\'glue\' should rebuild the HTML based on the \'tranform\' rule.')
				})
		})))

/*eslint-disable */
describe('stringAnalyser', () => 
	describe('#glue: 03', () => 
		it(`Should be able to rebuild the AST in a different way than the original source, while preserving indentation.`, () => {
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
						"root":".",
						"content": "<div>[<]../../hello.html[>]</div>"
					}
				})[>]
				[<]<h1>Hello World<h1>[>]
				<p>We use the to fuck around, and then even more</p>
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
				--
				<p>We use the to fuck around, and then even more</p>
			</body>
			</html>`

			const ast = getAST(text, '[<]', '[>]')
			const transform = (o,b,c) => b.indexOf(`./`) == 0 
				? '<h1>Hello</h1>\n<h1>Yes</h1>' 
				: '--'

			return ast.glue(transform, { indent: true })
				.then(value => {
					assert.equal(value, answer, '\'glue\' should rebuild the HTML based on the \'tranform\' rule.')
				})
		})))



