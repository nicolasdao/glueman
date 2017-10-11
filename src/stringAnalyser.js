/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const _ = require('lodash')

const removeDelimiters = (s, open, close) => s.replace(open, '').replace(close, '')

/*eslint-disable */
const escapeRegExp = str => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
/*eslint-enable */

const getNextOpening = (str, openings, closures) => {
	const result = _.sortBy(openings.map((o, idx) => Object.assign({ idx, opening: o }, (str.match(o) || { index: -1 }))), x => (x.index * 100) + x.idx).filter(x => x.index >= 0)[0]
	if (!result || result.index == -1)
		return null
	else 
		return {
			opening: result.opening,
			closure: closures[result.idx],
			open: result[0],
			pos: result.index
		}
}

const getLinesData = str => {
	if (str) { 
		const lines = str.split('\n')
		const firstLine = lines[0]
		const firstLineLength = firstLine.length
		const agg = lines.slice(1).reduce((acc,l,idx) => {
			const lg = l.length
			const line = idx + 2
			acc.charPosToLines = Array.from(Array(lg+1).keys()).reduce((a,v) => { a[acc.cursor + v] = line; return a }, acc.charPosToLines)
			acc.result.push({
				pos: acc.cursor,
				line: line,
				indentation: lg == 0 ? '' : ((l.match(/^(.*?)[^\s\t]/) || [])[1] || '')
			})
			acc.cursor += lg + 1
			return acc
		},{ 
			cursor: firstLineLength, 
			result: [{
				pos: 0,
				line: 1,
				indentation: firstLineLength == 0 ? '' : ((firstLine.match(/^(.*?)[^\s\t]/) || [])[1] || '')
			}], 
			charPosToLines: Array.from(Array(firstLineLength).keys()).reduce((acc,v) => { acc[v] = 1; return acc },{})
		})

		agg.result.get = posChar => {
			const line = agg.charPosToLines[posChar]
			return agg.result[line - 1]
		}

		return agg.result
	}
	else
		return []
}

const getAllOpeningsAndClosures = (str, openings, closures) => {
	const linesData = getLinesData(str)
	let openCursor = 0
	let closeCursor = 0
	const openingsAndClosures = []
	/*eslint-disable */
	while (true) {
		/*eslint-enable */
		const nextOpening = getNextOpening(str, openings, closures)
		if (nextOpening) {
			openCursor += nextOpening.pos
			openingsAndClosures.push(Object.assign({ line: linesData.get(openCursor) }, nextOpening, { pos: openCursor }))
			openCursor += nextOpening.open.length
			str = str.slice(nextOpening.pos + nextOpening.open.length)
			if (nextOpening.closure) {
				const closeStr = closeCursor > openCursor 
					// the pevious closing delimiter was found beyond the newly found starting delimiter, which means we've already 
					// captured the immediate next closing delimiter. That's why we need to readjust 'str' to make sure we look for 
					// another closing delimiter.
					? str.slice(closeCursor - openCursor) 
					: str
				const closureMatch = closeStr.match(nextOpening.closure)
				if (closureMatch) {
					closeCursor = (closeCursor > openCursor ? closeCursor : openCursor) + closureMatch.index + closureMatch[0].length
					openingsAndClosures.push({ line: linesData.get(closeCursor), closure: nextOpening.closure, close: closureMatch[0], pos: closeCursor })
				}
			}
		}
		else
			return _.sortBy(_.uniqBy(openingsAndClosures, x => x.pos), x => x.pos)
	}
}

const organizeDelimiters =  (str, openings, closures, options={}) => {
	const r = getAllOpeningsAndClosures(str, openings, closures)
	const result = r.reduce((a,i) => {
		if (i.opening) {
			if (i.closure) {
				const { opening, closure, open, pos, children, line } = a._currentAST
				a._stack.push({ opening, closure, open, pos, children: children || [], line })
				i.pos = { start: i.pos }
				a._currentAST = i
				a._currentAST.children = []
			}
			else {
				i.children = []
				const { opening, closure, open, pos: start, children, line } = i
				a._currentAST.children.push({ 
					opening, 
					closure, 
					open, 
					body: '',
					pos: { 
						start, 
						body: null,
						end: start + open.length 
					}, 
					children: children || [], 
					close: '',
					line
				})
			}
		}
		else {
			if (a._currentAST.closure != i.closure) {
				a._currentAST = a._stack.pop()
				while (a._currentAST.closure != i.closure) {
					a._currentAST = a._stack.pop()
					if (!a._currentAST)
						throw new Error(`Badly formatted file. Closing delimiter ${i.close} in position ${i.pos} does not have any starting delimiter.`)
				}
			}
				
			const latest = a._stack.pop()
			if (!latest)
				throw new Error(`Badly formatted file. Closing delimiter ${i.close} in position ${i.pos} does not have any starting delimiter.`)
			
			const bodyStart = a._currentAST.pos.start + a._currentAST.open.length
			const bodyEnd = i.pos - i.close.length
			latest.children.push(Object.assign({ close: i.close, body: str.slice(bodyStart, bodyEnd) }, a._currentAST, { 
				pos: { 
					start: a._currentAST.pos.start, 
					end: i.pos + i.close.length,
					body: {
						start: bodyStart,
						end: bodyEnd
					} 
				} 
			}))
			a._currentAST = latest
		}
		return a
	},{
		_currentAST: {
			opening: null,
			closure: null,
			open: null,
			pos: null,
			children: []
		},
		_stack:[]
	})

	if (result._stack.length > 0) {
		throw new Error(`Missing closing delimiter ${options.filename ? `in file ${options.filename} ` : ''}at ${result._currentAST.line.line}:${result._currentAST.pos.start - result._currentAST.line.pos}`)
	}

	return result._currentAST.children
}

const getAST = (str, openings, closures, options) => {
	let ast = []
	if (str && openings && closures) {
		const typeO = typeof(openings)
		const typeC = typeof(closures)
		const typeOIsRegExp = openings instanceof RegExp
		const typeCIsRegExp = closures instanceof RegExp

		if (((typeO == 'string' && !typeCIsRegExp) || (typeC == 'string' && !typeOIsRegExp)) &&  typeO != typeC)
			throw new Error('\'openings\' and \'closures\' must have the same types (either a string or an object).')
		if (typeO == 'object' && !typeOIsRegExp && typeC == 'object' && !typeCIsRegExp && (openings.length != undefined || closures.length != undefined) && (openings.length == undefined || closures.length == undefined))
			throw new Error('If \'openings\' or \'closures\' is an array, then both of them must be an array.')
		if (typeO == 'object' && !typeOIsRegExp && typeC == 'object' && !typeCIsRegExp && openings.length && closures.length && openings.length != closures.length)
			throw new Error('If \'openings\' and \'closures\' are both arrays, they should be of the same size.')

		let opens = openings
		let closes = closures 
		if (typeO == 'string' || typeOIsRegExp) 
			opens = [openings]
			
		if (typeC == 'string' || typeCIsRegExp) 
			closes = [closures]

		opens = opens.map(o => typeof(o) == 'string' ? escapeRegExp(o) : o)
		closes = closes.map(o => typeof(o) == 'string' ? escapeRegExp(o) : o)

		ast = organizeDelimiters(str, opens, closes, options)
	}

	ast.input = str 
	ast.glue = (transform, options) => glue(ast, transform, options)
	return ast
}

const glue = (ast, transform, options={}) => {
	if (ast && ast.input) {
		if (ast.length > 0) {
			return ast.reduce((p, delimiter) => p.then(acc => {
				const head = ast.input.slice(acc.cursor, delimiter.pos.start)
				const open = delimiter.open
				const close = delimiter.close
				acc.cursor = delimiter.pos.end - delimiter.close.length
				if (transform) {
					let newAst = (delimiter.children || []).map(x => x)
					newAst.input = ast.input
					const { start, end } = (delimiter.pos.body || { start: 0, end: 0 })
					return glue(newAst, transform, { start, end })
						.then(body => transform({ open, body, close }))
						.then(v => (v || '').replace(/\n/g, '\n' + delimiter.line.indentation))
						.then(v => head + v)
						.then(v => ({ cursor: acc.cursor, file: acc.file + v }))
				}
				else {
					const body = delimiter.pos.body ? ast.input.slice(delimiter.pos.body.start, delimiter.pos.body.end) : ''
					return Promise.resolve({ cursor: acc.cursor, file: acc.file + head + open + body + close })
				}
			}), Promise.resolve({
				cursor: options.start || 0,
				file: ''
			}))
				.then(({ cursor, file }) => {
					const end = options.end || ast.input.length
					if (end && cursor < end) 
						return file + ast.input.slice(cursor, end)
					else
						return file + ast.input.slice(cursor)
				})
		}
		else
			return Promise.resolve(ast.input.slice(options.start || 0, options.end))
	}
	else
		return Promise.resolve('')
} 

/**
 * Gets an object that represent all the attributes from a string (e.g. " src  ='./folder/index.html' root='./main' " -> { src: './folder/index.html', root: './main' })
 * @param  {String} s Attributes (e.g. " src='./folder/index.html' root='./main' ")
 * @return {Object}   Attributes object (e.g. { src: './folder/index.html', root: './main' })
 */
const getAttributes = s => s 
	? 	(o => {
		let out = {}
		for(let i in o) {
			if (i != '_isInsideAString' && i != '_expectingValue' && i != '_currentValueQuoteSymbol' && i != '_currentAttr' && i != '_strAcc')
				out[i] = o[i]
		}
		return out
	})
	/*eslint-disable */
	([...s].reduce((a,l, idx) => {
		/*eslint-enable */
		if (!a._isInsideAString) { // we're not inside a string
			if (l == '=') { // found an attribute
				a._currentAttr = a._strAcc.trim().split(' ').reverse()[0]
				if (a._currentAttr == '')
					throw new Error(`Badly formatted attribute string ${s}. Error before = character at position ${idx + 1}.`)
				a._expectingValue = true
				a._strAcc = ''
			}
			else if ((l == '"' || l == '\'')) { // found a potential start or end of a value
				if (a._expectingValue) {
					a._isInsideAString = true
					a._expectingValue = false
					a._currentValueQuoteSymbol = l 
					a._strAcc = ''
				}
				else
					throw new Error(`Badly formatted attribute string ${s}. Error before ${l} character at position ${idx + 1}`)
			}
			else
				a._strAcc += l
		}
		else {
			if (l == a._currentValueQuoteSymbol) { // found the end of a value
				a[a._currentAttr] = a._strAcc
				a._isInsideAString = false
				a._expectingValue = false
				a._currentValueQuoteSymbol = '\''
				a._currentAttr = ''
				a._strAcc = ''
			}
			else
				a._strAcc += l
		}
		return a
	}, {
		_isInsideAString: false,
		_expectingValue: false,
		_currentValueQuoteSymbol: '\'',
		_currentAttr: '',
		_strAcc:''
	}))
	: 	{}

const getPropertyValue = (obj, propStr) => (obj && propStr) ? propStr.split('.').reduce((a,prop) => a[prop], obj) : null

const topLevelXmlStrToObject = s => {
	if (s) {
		return [...s].reduce((a,l) => {
			const newLine = l == '\n'
			a._currentColumn++
			if (newLine) {
				a._currentLine++
				a._currentColumn = 0
			}
			if (a._lookingForOpeningProp) {
				const foundNewProp = l == '<'
				if (l == ' ' || newLine || l == '\t') {
					if (newLine)
						a._currentIndent = ''
					else
						a._currentIndent += l
				}
				else if (foundNewProp) {
					a._acquiringNewProp = true
					a._lookingForOpeningProp = false
				}
				else 
					throw new Error(`Badly formatted string (position ${a._currentLine}:${a._currentColumn}). Expecting '<' but found '${l}'`)
			}
			else {
				if (a._acquiringNewProp) {
					if (l.match(/[a-zA-Z0-9_]/)) // this is a valid character for a property name, so add it
						a._currentPropName += l
					else if (l == '>') { // found a closing signal that we have an entire property name
						a._acquiringNewProp = false
						a._currentPropValue = ''
					}
					else 
						throw new Error(`Badly formatted string (position ${a._currentLine}:${a._currentColumn}). A valid property name can only contain alphanumerical characters as well as '_'.`)
				}
				else { // looking for a closing of that prop as well as building its value
					const previousCharWasClosure = a._previousChar == '<'
					a._currentPropValue += l
					if (previousCharWasClosure && l == '/') { // might have found the beginning of the current property's closure
						a._currentPropClosure = ''
						a._buildingClosure = true
						a._currentPropIndent = a._currentIndent
					}
					else if (a._buildingClosure) {
						if (l == '>') { // found a complete closure
							if (a._currentPropName == a._currentPropClosure) { // bingo, we have found a valid property
								a.result[a._currentPropName] = removeExcessIndent(a._currentPropValue.slice(0, -(a._currentPropName.length + 3)), a._currentPropIndent)
								// reset the entire process, and start looking for another prop again.
								a._lookingForOpeningProp = true
								a._currentIndent = ''
								a._currentPropIndent = ''
								a._acquiringNewProp = false
								a._currentPropName = ''
								a._currentPropValue = ''
								a._currentPropClosure = ''
							}
							else {
								a._buildingClosure = false
								a._currentPropClosure == ''
							}
						}
						else { // still building the closure
							a._currentPropClosure += l
							if (a._currentPropName.indexOf(a._currentPropClosure) != 0) { // this does not match the prop name. Reset.
								a._currentPropClosure = ''
								a._buildingClosure = false
							}
						}	
					}
				}
			}

			a._previousChar = l
			return a
		}, 
		{
			_currentLine: 0,
			_currentColumn: 0,
			_previousChar: '',
			_lookingForOpeningProp: true,
			_currentIndent: '',
			_currentPropIndent: '',
			_acquiringNewProp: false,
			_currentPropName: '',
			_currentPropValue: '',
			_currentPropClosure: '',
			_buildingClosure: false,
			result: {}
		}).result
	}
	else
		return {}
}

const removeExcessIndent = (s,indent) => {
	if (s && indent) {
		const r = new RegExp('\n' + indent, 'g')
		return s.replace(r, '\n')
	}
	else
		return s
}

module.exports = {
	getAST,
	removeDelimiters,
	getAttributes,
	getPropertyValue,
	topLevelXmlStrToObject,
	getLinesData
}








