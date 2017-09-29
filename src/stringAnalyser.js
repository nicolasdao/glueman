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
		let openStringCursorCounter = 0
		let closeStringCursorCounter = 0
		const openSize = open.length
		const closeSize = close.length

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
			if (a.openStringCursorSizeReached) {
				a.openStringCursor = a.openStringCursor.substr(1) + l
			}
			else {
				a.openStringCursor += l 
				openStringCursorCounter++
				a.openStringCursorSizeReached = openStringCursorCounter == openSize
			}
			if (a.closeStringCursorSizeReached) {
				a.closeStringCursor = a.closeStringCursor.substr(1) + l
			}
			else {
				a.closeStringCursor += l 
				closeStringCursorCounter++
				a.closeStringCursorSizeReached = closeStringCursorCounter == closeSize
			}

			// C. Accumulate the text of the current AST
			a.currentAST.text += l

			// D. Decide whether or not we need to update the current AST
			const currentCursorStartsAnAST = a.openStringCursor == open
			const currentCursorConfirmAnAST = a.closeStringCursor == close

			// D.1. Update must occur because we may have found a new AST
			if (currentCursorStartsAnAST) {
				// 1. Adjust the AST value
				a.currentAST.text = a.currentAST.text.slice(0, -openSize)
				// 2. Save the AST to the stack
				a.AST_Stack.push(Object.assign({}, a.currentAST))
				// 3. Reset the current AST
				a.currentAST = { id: newId() , indent: a.indent, text: open, children:[] }
				// 4. Reset the current open cursor to make sure there are no overlaps
				a.openStringCursor = ''
				a.openStringCursorSizeReached = false
				openStringCursorCounter = 0
			}
			// D.2. Update must occur because we have found a the end of an AST
			else if (currentCursorConfirmAnAST && !a.currentAST.root) {
				// 1. Get the latest saved AST
				const latestAST = a.AST_Stack.pop()
				// 2. Add the current AST as a child of the latestAST
				const newAST = Object.assign({}, a.currentAST)
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
			currentAST: { id: newId() , indent: '', text:'', children:[], root: true },
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
					const s = reassembleAST(ASTBreakdown.currentAST)
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

const createAST = ({ id, indent, text, children }) => ({
	id: id || 'root',
	indent: indent || '',
	text,
	children,
	reassemble: (transform, options) => reassembleAST({ text, children }, Object.assign({ transform }, options || {}))
})

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

module.exports = {
	getAST
}








