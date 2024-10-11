import { createEmitter } from '@mwni/events'


export default function ({ url, autoReconnect = true, autoRetryRequests = false, socketOptions, impl }){
	let socket
	let requestCounter = 0
	let requestRegistry = []
	let responseBacklog = []
	let frozen = false
	let connected = false
	let connectionError
	let events = new createEmitter()

	function connect(){
		socket = impl.WebSocket({ url, options: socketOptions })
		socket.addEventListener('open', handleOpen)
		socket.addEventListener('close', handleClose)
		socket.addEventListener('error', handleError)
		socket.addEventListener('message', handleMessage)
	}

	function handleOpen(event){
		connected = true
		events.emit('open', event)
		events.emit('connect', event)
		pushRequests()
	}

	function handleClose(event){
		if(autoReconnect){
			setTimeout(connect, 1000)
		}

		if(!connected)
			return

		if(autoRetryRequests){
			for(let request of requestRegistry){
				request.sent = false
			}
		}else{
			for(let { reject } of requestRegistry){
				reject(new Error(event.reason))
			}
			requestRegistry.length = 0
		}
		
		connected = false
		events.emit('close', event)
		events.emit('disconnect', event)
	}

	function handleError(event){
		connectionError = event
		events.emit('error', event)
	}

	function handleMessage(evt){
		if(frozen){
			responseBacklog.push(evt)
			return
		}

		let payload = impl.mergeDecodeBuffers(JSON.parse(evt.data))

		if(payload.id){
			let handlerIndex = requestRegistry.findIndex(({id}) => id === payload.id)

			if(handlerIndex >= 0){
				let request = requestRegistry[handlerIndex]

				if(request.eventKey)
					request.emit(payload[request.eventKey], payload)
				else
					request.emit('message', payload)

				let isResolved = typeof request.resolveWhen === 'function'
					? request.resolveWhen(payload)
					: payload[request.eventKey] === request.resolveWhen

				let isErrored = typeof request.rejectWhen === 'function'
					? request.rejectWhen(payload)
					: payload[request.eventKey] === request.rejectWhen

				if(isResolved){
					request.resolve(payload)
				}else if(isErrored){
					if(!request.events.error)
						request.reject(payload)
				}else{
					return
				}

				requestRegistry.splice(handlerIndex, 1)
			}
		}else{
			events.emit('message', payload)
		}
	}

	function pushRequests(){
		if(!connected || frozen)
			return

		for(let request of requestRegistry.slice()){
			if(request.sent)
				continue

			socket.send(JSON.stringify(request.payload))

			if(request.id)
				request.sent = true
			else
				requestRegistry.splice(requestRegistry.indexOf(request), 1)
		}
	}

	connect()

	return {
		...events,
		get connected(){
			return connected
		},
		get connectionError(){
			return connectionError
		},
		get requests(){
			return requestRegistry
				.filter(request => !!request.id)
				.map(
					request => ({
						id: request.id,
						sent: request.sent
					})
				)
		},
		request({ resolveWhen, rejectWhen, eventKey, ...payload }){
			let events = createEmitter()
			let id = `r${++requestCounter}`
			let request = {
				payload: {
					...impl.stripEnodeBuffers(payload),
					id
				},
				...events,
				resolveWhen,
				rejectWhen,
				eventKey,
				id
			}

			return Object.assign(
				new Promise((resolve, reject) => {
					Object.assign(request, {
						resolve,
						reject
					})

					requestRegistry.push(request)
					pushRequests()
				}),
				request
			)
		},
		send(payload){
			requestRegistry.push({
				payload: impl.stripEnodeBuffers(payload)
			})
			pushRequests()
		},
		freeze(){
			frozen = true
		},
		unfreeze(){
			frozen = false

			while(responseBacklog.length > 0){
				handleMessage(responseBacklog.shift())
			}

			pushRequests()
		},
		close(code, reason){
			autoReconnect = false
			autoRetryRequests = false
			socket.close(code, reason)
		}
	}
}