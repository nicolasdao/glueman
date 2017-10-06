const { generate } = require('shortid')

const newId = () => `%___|${generate().replace(/[-|_]/g, '')}|___%`

const getAST = (s, delimiter) => {
	if (!delimiter)
		throw new Error('\'delimiter\' is required.')
	const { open, close } = delimiter
	if (!open)
		throw new Error('\'delimiter.open\' is required.')
	if (!close)
		throw new Error('\'delimiter.close\' is required.')
	if (open == close)
		throw new Error('\'delimiter.open\' and \'delimiter.close\' cannot be the same.')

	if (!s)
		return createAST('', [])
	else {
		const openIsRegEx = open instanceof RegExp
		const closeIsRegEx = close instanceof RegExp
		const openSize = openIsRegEx ? 0 : open.length
		const closeSize = closeIsRegEx ? 0 : close.length
		let openStringCursorCounter = 0
		let closeStringCursorCounter = 0
		let openRegExMatch = null // This is only used for a regex open. When a match is found, it is stored there.
		let closeRegExMatch = null // This is only used for a regex close. When a match is found, it is stored there.
		// Loop through each character

		const ASTBreakdown = [...s].reduce((a,l) => {
			// A. Manage the indentation of the current line
			// A.1. We've found a new line. Reset indentation
			if (l == '\n') {
				a.indent = ''
				a.inIndentationArea = true
			}
			else if (a.inIndentationArea && (l == '\t' || l == ' '))
				a.indent += l
			else if (a.inIndentationArea)
				a.inIndentationArea = false

			// B. Manage the value of the current open and close cursor
			// B.1. Manage the open cursor
			if (openIsRegEx) {
				a.openStringCursor += l
				openRegExMatch = (a.openStringCursor.match(open) || [])[0] 
			}
			else {
				if (a.openStringCursorSizeReached) {
					a.openStringCursor = a.openStringCursor.substr(1) + l
				}
				else {
					a.openStringCursor += l 
					openStringCursorCounter++
					a.openStringCursorSizeReached = openStringCursorCounter == openSize
				}
			}
			// B.2. Manage the close cursor
			if (closeIsRegEx) {
				a.closeStringCursor += l
				closeRegExMatch = (a.closeStringCursor.match(close) || [])[0]
			}
			else {
				if (a.closeStringCursorSizeReached) {
					a.closeStringCursor = a.closeStringCursor.substr(1) + l
				}
				else {
					a.closeStringCursor += l 
					closeStringCursorCounter++
					a.closeStringCursorSizeReached = closeStringCursorCounter == closeSize
				}
			}

			// C. Accumulate the text of the current AST
			a.currentAST.text += l

			// D. Decide whether or not we need to update the current AST
			const currentCursorStartsAnAST = openRegExMatch || a.openStringCursor == open
			const currentCursorConfirmAnAST = closeRegExMatch || a.closeStringCursor == close

			// D.1. Update must occur because we may have found a new AST
			if (currentCursorStartsAnAST) {
				// 1. Adjust the AST value
				a.currentAST.text = a.currentAST.text.slice(0, openRegExMatch ? -openRegExMatch.length : -openSize)
				// 2. Save the AST to the stack
				a.AST_Stack.push(Object.assign({}, a.currentAST))
				// 3. Reset the current AST
				a.currentAST = { id: newId() , open: openRegExMatch || open, indent: a.indent, text: openRegExMatch || open, children:[] }
				// 4. Reset the current open cursor to make sure there are no overlaps
				a.openStringCursor = ''
				a.openStringCursorSizeReached = false
				openStringCursorCounter = 0
			}
			// D.2. Update must occur because we have found a the end of an AST
			if (currentCursorConfirmAnAST && !a.currentAST.root) {
				// 1. Get the latest saved AST
				const latestAST = a.AST_Stack.pop()
				// 2. Add the current AST as a child of the latestAST
				const newAST = Object.assign({}, a.currentAST)
				newAST.close = closeRegExMatch || close
				latestAST.children.push(createAST(newAST))
				// 3. Replace the current AST by its id 
				latestAST.text += a.currentAST.id 
				a.currentAST = latestAST
				// 4. Reset the current close cursor to make sure there are no overlaps
				a.closeStringCursor = ''
				a.closeStringCursorSizeReached = false
				closeStringCursorCounter = 0
			}

			return a

		}, { 
			indent: '',
			inIndentationArea: true,
			openStringCursor:'', 
			openStringCursorSizeReached: false, 
			closeStringCursor:'', 
			closeStringCursorSizeReached: false,
			currentAST: { id: newId() , indent: '', text:'', open: null, close: null, children:[], root: true },
			AST_Stack:[]
		})
		
		// E. If there are some unresolve AST, then undo them and merge them back down.
		if (ASTBreakdown.AST_Stack.length > 0) { 
			const l = ASTBreakdown.AST_Stack.length
			for (let i = 0; i < l; i++) {
				const latestAST = ASTBreakdown.AST_Stack.pop()
				// There are real valid blocks here, so we just need to treat them as part as the
				// previous AST
				if (ASTBreakdown.currentAST.children.length > 0) {  
					latestAST.text += ASTBreakdown.currentAST.text
					latestAST.children.push(...ASTBreakdown.currentAST.children)
				}
				else { // this was actually invalid. Just rebuild and simply merge with the previous AST
					const s = reassembleASTSync(ASTBreakdown.currentAST)
					latestAST.text += s
				}

				ASTBreakdown.currentAST = latestAST
			}
		}

		return createAST({ 
			indent: ASTBreakdown.currentAST.indent, 
			text: ASTBreakdown.currentAST.text, 
			children: ASTBreakdown.currentAST.children 
		})
	}
}

const createAST = ({ id, indent, text, children, open, close }) => ({
	id: id || 'root',
	open,
	close,
	indent: indent || '',
	text,
	children,
	reassemble: (transform, options) => reassembleAST({ text, children }, Object.assign({ transform }, options || {}))
})

const removeDelimiters = (s, open, close) => s.replace(open, '').replace(close, '')

/*eslint-disable */
const escapeRegExp = str => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
/*eslint-enable */

/**
 * Gets a string the represent the reassembled AST. If an AST has no children, this is simply the value of its 'text' property.
 * If an AST has AST children, then those AST children are also reassembled, and those results respectively replaces their containers
 * indide the AST's text property.
 *  
 * @param  {Object} AST     				AST object. This object was created by the 'createAST' function.
 * @param  {Object} options
 * @param  {Function} options.transform		Function that takes a single String argument (reassembled child) and return a String.
 * @param  {Boolean} options.indent 		Maintain indentation for each reinjected reassembled child.
 * @return {String}         				Reassembled AST
 */
const reassembleAST = (AST, options = {}) => {
	if (AST && AST.text) {
		const { transform, indent } = options
		if (AST.children.length > 0) {
			const reassembleJobs = AST.children.map(ast => reassembleAST(ast, options)
				.then(s => transform ? transform(s) : s)
				.then(s => indent ? indentString(s, ast.indent) : s)
				.then(s => ({ id: ast.id, value: s })))

			return Promise.all(reassembleJobs)
				.then(values => values.reduce((s, ast) => s.replace(new RegExp(escapeRegExp(ast.id), 'g'), ast.value), AST.text))
		}
		else 
			return Promise.resolve(AST.text)
	}
	else
		return Promise.resolve('')
}

const reassembleASTSync = (AST, options = {}) => {
	if (AST && AST.text) {
		const { indent } = options
		const transform = null
		if (AST.children.length > 0) {
			return AST.children.map(ast => ({ 
				id: ast.id, 
				value: (s => indent ? indentString(s, ast.indent) : s)((s => transform ? transform(s) : s)(reassembleAST(ast, options)))
			})) 
				.reduce((s, ast) => {
					const g = s.replace(new RegExp(escapeRegExp(ast.id), 'g'), ast.value)
					return g
				}, AST.text)
		}
		else
			return AST.text
	}
	else
		return ''
}

const indentString = (s,i) => s && i ? s.replace(/\n/g, `\n${i}`) : s

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
	topLevelXmlStrToObject
}








