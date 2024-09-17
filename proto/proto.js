export default function proto(...methods){
	let prototype = { extend: proto }

	for(let method of methods){
		if(typeof method === 'function'){
			if(!method.name)
				throw new Error(`You may not pass anonymous functions`)

			prototype[method.name] = method
		}else if(typeof method === 'object'){
			Object.assign(prototype, method)
		}else{
			throw new Error(`You must pass either functions or objects with functions`)
		}
	}

	let object = Object.create(prototype)

	if(this)
		Object.assign(object, this)

	return object
}