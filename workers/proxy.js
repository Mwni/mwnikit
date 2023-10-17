export function create({ data, process }){
	let proxyId = Math.random()
		.toString()
		.slice(2)

	let functions = []
	let circular = new WeakSet()
	let createStruct = data => {
		if(Array.isArray(data)){
			return {
				type: 'array',
				items: data
					.map(item => createStruct(item))
			}
		}else if(typeof(data) === 'function'){
			return {
				type: 'function',
				pointer: functions.push(data) - 1
			}
		}else if(typeof(data) === 'object'){
			if(circular.has(data))
				return { type: 'object', properties: {} }
			else
				circular.add(data)

			return {
				type: 'object',
				properties: Object.entries(data)
					.filter(([k, v]) => !!v)
					.reduce(
						(obj, [k, v]) => ({ ...obj, [k]: createStruct(v) }), 
						{}
					)
			}
		}else{
			return {
				type: typeof(data),
				value: data
			}
		}
	}

	process.on('message', async message => {
		if(message.proxyId !== proxyId)
			return

		if(message.type === 'call'){
			try{	
				let args = message.proxy
					? derive({ proxy: message.proxy, process })
					: message.args

				process.send({ 
					type: 'response', 
					proxyId,
					id: message.id,
					value: await functions[message.function](...args) 
				})
			}catch(error){
				process.send({ 
					type: 'response',
					proxyId,
					id: message.id,
					error
				})
			}
		}
	})


	return {
		proxyId,
		struct: createStruct(data)
	}
}

export function derive({ proxy, process }){
	let { proxyId, struct } = proxy
	let counter = 0
	let calls = []
	let createData = struct => {
		if(struct.type === 'array'){
			return struct.items
				.map(item => createData(item))
		}else if(struct.type === 'function'){
			return (...args) => {
				let id = counter++
				let msg = { 
					type: 'call',
					proxyId,
					function: struct.pointer,
					id
				}

				if(args.some(arg => typeof arg === 'function'))
					msg.proxy = create({ data: args, process })
				else
					msg.args = args

				try{
					process.send(msg)
				}catch(error){
					console.error(`failed to send data to proxy:`, args)
					throw error
				}

				return new Promise((resolve, reject) => {
					calls.push({ id, resolve, reject })
				})
			}
		}else if(struct.type === 'object'){
			return Object.entries(struct.properties)
				.reduce(
					(obj, [k, v]) => ({ ...obj, [k]: createData(v) }), 
					{}
				)
		}else{
			return struct.value
		}
	}

	process.on('message', async message => {
		if(message.proxyId !== proxyId)
			return

		if(message.type === 'response'){
			let callIndex = calls.findIndex(call => call.id === message.id)
			let call = calls[callIndex]

			if(message.error)
				call.reject(message.error)
			else
				call.resolve(message.value)

			calls.splice(callIndex, 1)
		}
	})

	return createData(struct)
}