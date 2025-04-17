export function stringifyJsonWithBuffers(payload, ...args){
	return JSON.stringify(stripEnodeBuffers(payload), ...args)
}

export function parseJsonWithBuffers(json){
	return JSON.parse(mergeDecodeBuffers(JSON.parse(json)))
}

export function stripEnodeBuffers(payload) {
    let buffers = [];

    const walk = (value) => {
        if(value instanceof ArrayBuffer || value instanceof Uint8Array){
            let buffer = value instanceof Uint8Array 
				? value 
				: new Uint8Array(value)

            buffers.push(btoa(String.fromCharCode(...buffer)))
			
            return { '@buffer': buffers.length - 1 }
        }

        if(Array.isArray(value))
            return value.map(walk)
        
        if (value && typeof value === 'object') {
            return Object.entries(value).reduce(
                (obj, [key, val]) => ({
                    ...obj,
                    [key]: walk(val)
                }),
                {}
            )
        }

        return value
    }

    let strippedPayload = walk(payload)

    if(buffers.length === 0){
        return payload
    }

    return {
        ...strippedPayload,
        '@buffers': buffers
    }
}

export function mergeDecodeBuffers(payload) {
    const { '@buffers': buffers, ...originalPayload } = payload

    const walk = (value) => {
        if(Array.isArray(value))
            return value.map(walk)

        if(value && typeof value === 'object'){
            if (value.hasOwnProperty('@buffer')){
                let base64String = buffers[value['@buffer']]
                let binaryString = atob(base64String)
                let byteArray = new Uint8Array(binaryString.length)

                for (let i = 0; i < binaryString.length; i++){
                    byteArray[i] = binaryString.charCodeAt(i)
                }

                return byteArray;
            }

            return Object.entries(value).reduce(
                (obj, [key, val]) => ({
                    ...obj,
                    [key]: walk(val)
                }),
                {}
            )
        }

        return value
    }

    return walk(originalPayload)
}