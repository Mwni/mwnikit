import { randomBytes } from 'crypto'
import { generateRandomToken as generateRandomTokenImpl } from './random.js'


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