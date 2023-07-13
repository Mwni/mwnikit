import { randomBytes } from 'crypto'


export function generateRandomToken({ 
	segments = 1, 
	charactersPerSegment = 6, 
	alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' 
} = {}){
	return Array(segments)
		.fill(0)
		.map(() => {
			let bytes = randomBytes(charactersPerSegment)
			let str = ''

			for(let i=0; i<bytes.length; i++){
				str += alphabet[bytes[i] % alphabet.length]
			}

			return str
		})
		.join('-')
}