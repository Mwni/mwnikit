import { parse } from 'url'
import { WebSocketServer } from 'ws'
import { createEmitter } from '@mwni/events'


export default ({ server, authorize, heartbeatInterval = 5000 }) => {
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

	server.on(
		'upgrade', 
		async (request, sock, head) => {
			try{
				var { pathname: path, query } = parse(request.url, true)
				var httpMeta = {
					ip: sock.remoteAddress,
					path,
					query,
					headers: request.headers
				}

				let data = await authorize(httpMeta)

				wss.handleUpgrade(request, sock, head, socket => {
					let client = {
						ip: sock.remoteAddress,
						httpMeta,
						...createEmitter(),
						...data,
						send: payload => socket.send(
							JSON.stringify(payload)
						),
						close: () => {
							socket.close()
						},
						alive: true,
						connected: true,
						socket,
					}

					socket.on('message', message => {
						let { command, event, ...payload } = JSON.parse(message)
						let key = command || event

						if(client.listeners[key]){
							client.emit(
								key, 
								payload
							)
						}else{
							if(command)
								client.emit('noop', { command })
						}
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
					events.emit('accept', client)
				})
			}catch(error){
				sock.destroy()
				events.emit('reject', {
					...httpMeta,
					error
				})
			}
		}
	)
	
	return {
		...events
	}
}