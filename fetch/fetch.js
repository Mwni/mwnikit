export async function get({ url, query, headers }){
	let queryString = new URLSearchParams(query).toString()
	let queryUrl = `${url}?${queryString}`
	let res = await fetch(queryUrl, {
		headers: {
			'Accept': 'application/json',
			...headers
		}
	})
	
	return await parseResponse(res)
}

export async function post({ url, payload, headers }){
	let res = await fetch(url, {
		method: 'post',
		body: JSON.stringify(payload),
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			...headers
		}
	})
	
	return await parseResponse(res)
}

export function upload({ url, data, headers, onProgress }){
	let request = new XMLHttpRequest();

	request.open('POST', url)
	
	for(let [key, value] of Object.entries(headers)){
		request.setRequestHeader(key, value)
	}
	
	request.send(data)

	request.upload.addEventListener('progress', evt => {
		onProgress(evt.loaded / evt.total)
	})

	return Object.assign(
		new Promise((resolve, reject) => {
			request.addEventListener('load', evt => {
				resolve()
			})
		
			request.addEventListener('error', error => {
				reject(error)
			})
		}),
		{
			abort: () => {
				try{ 
					request.abort()
					return true
				}catch{
					return false
				}
			}
		}
	)
}


async function parseResponse(res){
	let text = await res.text()
	let data

	try{
		data = JSON.parse(text)
	}catch{
		throw {
			message: text,
			status: res.status
		}
	}

	if(!res.ok){
		throw {
			...data,
			status: res.status
		}
	}

	return data
}