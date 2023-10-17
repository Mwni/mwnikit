import { pathToFileURL } from 'url'
import { derive as deriveProxy, create as createProxy } from './proxy.js'

const taskFile = process.argv[3]
const taskFunc = process.argv[5]
const module = await import(pathToFileURL(taskFile))

process.send({ type: 'ready' })

let { args } = await new Promise(resolve => {
	process.once(
		'message', 
		message => message.type === 'start'
			? resolve(message)
			: null
	)
})

try{
	let result = await module[taskFunc](
		...deriveProxy({ proxy: args, process })
	)

	process.send({ 
		type: 'return', 
		value: createProxy({ data: result, process }) 
	})
}catch(error){
	console.error(error)
	process.send({ 
		type: 'fatal', 
		error
	})
}