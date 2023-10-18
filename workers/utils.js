import path from 'path'
import { fileURLToPath } from 'url'


export function getWorkerFile(){
	let __filename = fileURLToPath(import.meta.url)
	let __dirname = path.dirname(__filename)

	return path.join(__dirname, './worker.js')
}


export function getCallerFile(){
	let originalPrepareStackTrace = Error.prepareStackTrace
	let holster = {}

	Error.prepareStackTrace = (_, stack) => stack
	Error.captureStackTrace(holster)

	let file = holster.stack
		.filter(entry => !entry.isNative() && !entry.isEval())
		.map(entry => entry.getFileName())
		.find(file => !file.includes('mwni/workers'))

	if(file.startsWith('file:'))
		file = fileURLToPath(file)

    Error.prepareStackTrace = originalPrepareStackTrace

    return file
}