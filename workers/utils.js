import path from 'path'
import { fileURLToPath } from 'url'


export function getWorkerFile(){
	let __filename = fileURLToPath(import.meta.url)
	let __dirname = path.dirname(__filename)

	return path.join(__dirname, './worker.js')
}


export function getCallerFile(){
	let originalFunc = Error.prepareStackTrace
	let error = new Error()
	let file

	Error.prepareStackTrace = (error, stack) => stack
	file = fileURLToPath(error.stack[2].getFileName())
    Error.prepareStackTrace = originalFunc

    return file
}