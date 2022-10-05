import createSerializer from '@structdb/serializer'


export default function createProtobuf({ messages, bufferSize }){
	let buffer = new ArrayBuffer(bufferSize)
	let types = []
	let serializers = {}

	for(let [type, schema] of Object.entries(messages)){
		serializers[type] = createSerializer({ buffer, schema })
		types.push(type)
	}

	types.sort()
	
	return {
		encode(type, payload){
			if(!serializers[type])
				throw new RangeError(`No schema given for message type "${type}"`)

			let index = types.indexOf(type)
			let payloadBytes = new Uint8Array(serializers[type].serialize(payload))
			let messageBytes = new Uint8Array(payloadBytes.byteLength + 1)

			messageBytes[0] = index
			messageBytes.set(payloadBytes, 1)

			return messageBytes.buffer
		},

		decode(buffer){
			let bytes = new Uint8Array(buffer)
			let index = bytes[0]
			let type = types[index]
			let serializer = serializers[type]

			if(!serializer)
				throw new RangeError(`No schema given for message type "${type}"`)

			try{
				return {
					type,
					payload: serializers[type].deserialize(
						bytes
							.slice(1)
							.buffer
					)
				}
			}catch(error){
				throw new Error(`Encountered corrupt binary message`)
			}
		}
	}
}