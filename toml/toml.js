import toml from 'toml'


export function parseToml(str, convention){
	let config = toml.parse(str)

	if(convention === 'camelCase'){
		let transformed = {}

		for(let [key, directive] of Object.entries(config)){
			transformed[key.toLowerCase()] = camelify(directive)
		}

		return transformed
	}else{
		return config
	}
}

export function overrideToml(toml, ...overrides){
	if (!overrides.length) 
		return toml

	let source = overrides.shift()

	if(isObject(toml) && isObject(source)){
		for (const key in source){
			if(isObject(source[key])){
				if(!toml[key]) 
					Object.assign(toml, { [key]: {} })

				overrideToml(toml[key], source[key])
			}else{
				Object.assign(toml, { [key]: source[key] })
			}
		}
	}

	return overrideToml(toml, ...overrides)
}

function camelify(obj){
	if(Array.isArray(obj))
		return obj.map(o => camelify(o))

	if(typeof obj === 'object'){
		let camelified = {}

		for(let [key, value] of Object.entries(obj)){
			if(key === key.toUpperCase()){
				key = key.toLowerCase()
				value = camelify(value)
			}else{
				key = key.replace(/_([a-z])/g, match => match[1].toUpperCase())
			}

			camelified[key] = value
		}

		return camelified
	}

	return obj
}

function isObject(item) {
	return item && typeof item === 'object' && !Array.isArray(item)
}