import createSocket from './socket.js'
import WebSocket from 'ws'


export default function(conf){
	return createSocket({
		...conf,
		impl: {
			WebSocket: ({ url }) => new WebSocket(url)
		}
	})
}