export function assignDeep(target, ...overrides){
	if (!overrides.length) 
		return target

	let source = overrides.shift()

	if(isObject(target) && isObject(source)){
		for (const key in source){
			if(isObject(source[key])){
				if(!target[key]) 
					Object.assign(target, { [key]: {} })

				assignDeep(target[key], source[key])
			}else{
				Object.assign(target, { [key]: source[key] })
			}
		}
	}

	return assignDeep(target, ...overrides)
}

export function isObject(item) {
	return item && typeof item === 'object' && !Array.isArray(item)
}