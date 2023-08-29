import createSocket from './socket.js'


export default function(conf){
	return createSocket({
		...conf,
		impl: {
			WebSocket: ({ url }) => new WebSocket(url)
		}
	})
}