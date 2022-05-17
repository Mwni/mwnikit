import path from 'path'
import { fileURLToPath } from 'url'


export function pin(){
	return path.dirname(getCallerFile(3))
}

export function based(base){
	return base === path.dirname(getCallerFile(4))
}

export function locate(base){
	let relative = path.relative(base, getCallerFile(4))

	return relative.replace(/\.js$/, '')
}


function getCallerFile(offset){
	let originalFunc = Error.prepareStackTrace
	let error = new Error()
	let file

	Error.prepareStackTrace = (error, stack) => stack
	file = fileURLToPath(error.stack[offset].getFileName())
    Error.prepareStackTrace = originalFunc

    return file
}