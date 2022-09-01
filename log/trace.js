import path from 'path'
import { fileURLToPath } from 'url'


export function trace(){
	let stack = getStack()
	let file = stack[3]

	if(!file)
		return {
			file: '?',
			name: '?',
			stack: []
		}

	let name = path.basename(file)
		.replace(/\.js$/, '')

	return { file, name, stack }
}

export function diff(base, trace){
	if(path.dirname(base.file) === path.dirname(trace.file))
		return { root: true, name: trace.name }

	let relative = path.relative(
		path.dirname(base.file),
		trace.file
	)

	let name = relative
		.replace(/\.js$/, '')

	return { name }
}


function getStack(){
	let originalFunc = Error.prepareStackTrace
	let error = new Error()
	let file

	Error.prepareStackTrace = (error, stack) => stack

	let stack = error.stack
		.map(entry => entry.getFileName())
		.filter(Boolean)
		.filter(file => file.startsWith('file:'))
		.map(file => fileURLToPath(file))

    Error.prepareStackTrace = originalFunc

    return stack
}