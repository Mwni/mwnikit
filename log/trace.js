import path from 'path'
import { fileURLToPath } from 'url'


export function trace(){
	let stack = process.versions.bun ? getBunStack() : getNodeStack()
	let file = stack[3]

	if(!file)
		return {
			file: '?',
			name: '?',
			stack: []
		}

	let name = path.basename(file)
		.replace(/\.js$/, '')
		.replace(/\.ts$/, '')

	return { 
		dir: path.dirname(file),
		file, 
		name, 
		stack 
	}
}

export function diff(base, trace){
	if(base === path.dirname(trace.file))
		return { root: true, name: trace.name }

	let relative = path.relative(
		base,
		trace.file
	)

	let name = relative
		.replace(/\.js$/, '')

	return { name }
}

export function pin(dir, trace){
	return path.normalize(path.join(trace.dir, dir))
}


function getNodeStack(){
	let orgPrepareStackTrace = Error.prepareStackTrace
	let holster = {}

	Error.prepareStackTrace = (_, stack) => stack
	Error.captureStackTrace(holster)

	let stack = holster.stack
		.filter(entry => !entry.isNative() && !entry.isEval())
		.map(entry => entry.getFileName())
		.filter(Boolean)
		.filter(file => file.startsWith('file:'))
		.map(file => fileURLToPath(file))

	Error.prepareStackTrace = orgPrepareStackTrace

	return stack
}

function getBunStack(){
	let orgPrepareStackTrace = Error.prepareStackTrace
	let holster = {}

	Error.prepareStackTrace = (_, stack) => stack
	Error.captureStackTrace(holster)

	let stack = holster.stack
		.filter(entry => !entry.isNative() && !entry.isEval())
		.map(entry => entry.getFileName())
		.filter(Boolean)

	Error.prepareStackTrace = orgPrepareStackTrace

	return stack
}