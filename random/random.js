export function generateRandomToken({ segments, charactersPerSegment, alphabet, randomBytes }){
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


export function shuffle(arr){
	let temp
	let j
	let i = arr.length

	while(--i > 0){
		j = Math.floor(Math.random() * (i+1))
		temp = arr[j]
		arr[j] = arr[i]
		arr[i] = temp
	}

	return arr
  }