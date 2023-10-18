import fs from 'fs'
import pu from 'path'
import { fork } from 'child_process'
import { getCallerFile, getWorkerFile } from './utils.js'
import { create as createProxy, derive as deriveProxy } from './proxy.js'


export default async function(path, ...args){
	let workerFile = getWorkerFile()
	let callerFile = getCallerFile()
	let callerDir = pu.dirname(callerFile)
	let [file, func] = path.split(':')

	if(!file)
		file = callerFile
	else
		file = pu.join(callerDir, file)
		
		
	let childProcess = fork(
		workerFile, 
		[
			'--file',
			file,
			'--func',
			func
		]
	)

	let exitHandler = () => {
		childProcess.kill()
	}

	process.on('SIGINT', exitHandler)
	process.on('uncaughtException', exitHandler)
	process.on('beforeExit', exitHandler)
	process.on('exit', exitHandler)

	await new Promise(resolve => {
		childProcess.once(
			'message', 
			message => message.type === 'ready'
				? resolve()
				: null
		)
	})

	childProcess.send({
		type: 'start', 
		args: createProxy({ data: args, process: childProcess }) 
	})

	try{
		return new Promise((resolve, reject) => {
			childProcess.on('message', message => {
				if(message.type === 'return'){
					resolve(deriveProxy({ proxy: message.value, process: childProcess }))
				}else if(message.type === 'fatal'){
					reject(message.error)
				}
			})
		})
	}catch(error){
		throw error
	}finally{
		process.off('SIGINT', exitHandler)
		process.off('uncaughtException', exitHandler)
		process.off('beforeExit', exitHandler)
		process.off('exit', exitHandler)
	}
}