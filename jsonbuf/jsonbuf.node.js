export function stringifyJsonWithBuffers(payload, ...args){
	return JSON.stringify(stripEnodeBuffers(payload), ...args)
}

export function parseJsonWithBuffers(json){
	return JSON.parse(mergeDecodeBuffers(JSON.parse(json)))
}

export function stripEnodeBuffers(payload){
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

export function mergeDecodeBuffers(payload){
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