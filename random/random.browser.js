import { generateRandomToken as generateRandomTokenImpl } from './random.js'


function randomBytes(n){
	let bytes = new Uint8Array(n)

	for(let i=0; i<n; i+=65536){
		(window.crypto || window.msCrypto).getRandomValues(
			bytes.subarray(i, i + Math.min(n - i, 65536))
		)
	}

	return bytes
}

export function generateRandomToken({ 
	segments = 1, 
	charactersPerSegment = 6, 
	alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' 
} = {}){
	return generateRandomTokenImpl({
		segments,
		charactersPerSegment,
		alphabet,
		randomBytes
	})
}

export { shuffle } from './random.js'