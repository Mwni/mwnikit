import { parse } from 'url'
import { WebSocketServer } from 'ws'
import { createEmitter } from '@mwni/events'


export default ({ server, authorize, heartbeatInterval = 5000 } = {}) => {
	const wss = new WebSocketServer({ noServer: true })
	const events = createEmitter()
	const clients = []

	setInterval(
		() => {
			for(let client of clients){
				if(!client.alive){
					client.close()
					continue
				}
	
				client.alive = false
				client.socket.ping()
			}
		},
		heartbeatInterval
	)
	
	function register(socket, info){
		let client = {
			...createEmitter(),
			...info,
			send: payload => socket.send(
				JSON.stringify(stripEnodeBuffers(payload))
			),
			close: () => {
				socket.close()
			},
			ip: info.http.ip,
			alive: true,
			connected: true,
			socket
		}

		socket.on('message', message => {
			client.emit(
				'message',
				mergeDecodeBuffers(JSON.parse(message))
			)
		})

		socket.on('pong', () => {
			client.alive = true
		})

		socket.on('close', (code, reason) => {
			clients.splice(clients.indexOf(client), 1)
			client.connected = false
			client.emit('disconnect', { code, reason })
		})

		clients.push(client)
		events.emit('client', client)
	}

	async function middleware(ctx, next){
		let upgradeHeader = (ctx.request.headers.upgrade || '')
			.split(',')
			.map(s => s.trim().toLowerCase())

		if(~upgradeHeader.indexOf('websocket')){
			try{
				var http = {
					ip: ctx.ip,
					path: ctx.path,
					query: ctx.query,
					headers: ctx.headers
				}

				let info = authorize
					? await authorize(http)
					: {}

				wss.handleUpgrade(ctx.req, ctx.request.socket, Buffer.alloc(0), ws => {
					register(ws, { http, ...info })
				})

				ctx.respond = false
			}catch(error){
				ctx.throw(403)
				return
			}
		}
		
		await next()
	}

	if(server){
		server.on(
			'upgrade', 
			async (request, sock, head) => {
				try{
					var { pathname: path, query } = parse(request.url, true)
					var http = {
						ip: sock.remoteAddress,
						path,
						query,
						headers: request.headers
					}
	
					let info = authorize
						? await authorize(http)
						: {}
	
					wss.handleUpgrade(request, sock, head, socket => {
						register(socket, { http, ...info })
					})
				}catch(error){
					sock.destroy()
					events.emit('reject', { http, error })
				}
			}
		)
	}

	return {
		...events,
		clients,
		middleware
	}
}

function stripEnodeBuffers(payload){
	let buffers = []
	let walk = value => {
		if(value instanceof Buffer){
			buffers.push(value.toString('base64'))
			return { '@buffer': buffers.length - 1 }
		}
	
		if(Array.isArray(value))
			return value.map(walk)
		
		if(value && typeof value === 'object')
			return Object.entries(value).reduce(
				(obj, [key, value]) => ({
					...obj,
					[key]: walk(value)
				}),
				{}
			)

		return value
	}

	let strippedPayload = walk(payload)

	if(buffers.length === 0)
		return payload

	return {
		...strippedPayload,
		'@buffers': buffers
	}
}

function mergeDecodeBuffers(payload){
	let { '@buffers': buffers, ...originalPayload } = payload
	let walk = value => {
		if(Array.isArray(value))
			return value.map(walk)
		
		if(value && typeof value === 'object'){
			if(value.hasOwnProperty('@buffer')){
				return Buffer.from(buffers[value['@buffer']], 'base64')
			}

			return Object.entries(value).reduce(
				(obj, [key, value]) => ({
					...obj,
					[key]: walk(value)
				}),
				{}
			)
		}

		return value
	}

	return walk(originalPayload)
}