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
		events.emit('connect', event)
		pushRequests()
	}

	function handleClose(event){
		if(autoReconnect){
			setTimeout(connect, 1000)
		}

		if(!connected){
			return
		}

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

		let { event, ...payload } = JSON.parse(evt.data)

		if(payload.id){
			let handlerIndex = requestRegistry.findIndex(({id}) => id === payload.id)

			if(handlerIndex >= 0){
				let request = requestRegistry[handlerIndex]

				request.emit(event, payload)

				let isResolved = typeof request.expectEvent === 'function'
					? request.expectEvent({ event, ...payload })
					: event === request.expectEvent

				if(isResolved){
					request.resolve(payload)
				}else if(event === 'error'){
					if(!request.events.error)
						request.reject(payload)
				}else{
					return
				}

				requestRegistry.splice(handlerIndex, 1)
			}
		}else if(requestRegistry.length > 0 && event === 'error'){
			let lastRequest = requestRegistry.pop()

			if(lastRequest.listeners.error)
				lastRequest.emit(event, payload)
			else
				lastRequest.reject(payload)
		}else{
			events.emit(event, payload)
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

	return Object.assign(
		events,
		{
			status(){
				return {
					connected,
					connectionError,
					openRequests: requestRegistry.map(
						request => ({
							id: request.id,
							sent: request.sent
						})
					)
				}
			},
			request({ expectEvent, ...payload }){
				let events = createEmitter()
				let id = `r${++requestCounter}`
				let request = {
					payload: {
						...payload,
						id
					},
					...events,
					expectEvent,
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
				requestRegistry.push({ payload })
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
			}
		}
	)
}