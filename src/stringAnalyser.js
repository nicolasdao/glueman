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
		const ASTBreakdown = [...s].reduce((a,l) => {
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

			a.currentAST.text += l
			const currentCursorStartsAnAST = a.openStringCursor == open
			const currentCursorConfirmAnAST = a.closeStringCursor == close

			if (currentCursorStartsAnAST) {
				// 1. Adjust the AST value
				a.currentAST.text = a.currentAST.text.slice(0, -openSize)
				// 2. Save the AST to the stack
				a.AST_Stack.push(Object.assign({}, a.currentAST))
				// 3. Reset the current AST
				a.currentAST = { id: newId() ,text: open, children:[] }
				// 4. Reset the current open cursor to make sure there are no overlaps
				a.openStringCursor = ''
				a.openStringCursorSizeReached = false
				openStringCursorCounter = 0
			}
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
			openStringCursor:'', 
			openStringCursorSizeReached: false, 
			closeStringCursor:'', 
			closeStringCursorSizeReached: false,
			currentAST: { id: newId() ,text:'', children:[], root: true },
			AST_Stack:[]
		})
		
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

		return createAST({ text: ASTBreakdown.currentAST.text, children: ASTBreakdown.currentAST.children })
	}
}

const createAST = ({ id, text, children }) => ({
	id: id || 'root',
	text,
	children,
	reassemble: (transform) => reassembleAST({ text, children }, { transform })
})

/*eslint-disable */
const escapeRegExp = str => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
/*eslint-enable */

const reassembleAST = (AST, options = {}) => {
	if (AST && AST.text) {
		const { transform } = options
		if (AST.children.length > 0) {
			return AST.children.map(ast => ({ id: ast.id, value: transform ? transform(reassembleAST(ast, options)) : reassembleAST(ast, options) })).reduce((s, ast) => {
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

module.exports = {
	getAST
}








