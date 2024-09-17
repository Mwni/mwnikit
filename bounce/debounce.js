const instances = []

export function debounce({ id, call, this: thisArg, args, time, timeout }){
	if(!id)
		id = call

	let instance = instances.find(i => i.id === id)

	if(!instance){
		instances.push(instance = { id })
	}

	clearTimeout(instance.timer)

	instance.call = call
	instance.this = thisArg
	instance.args = args
	instance.timer = setTimeout(
		() => {
			clearTimeout(instance.timeoutTimer)
			instance.call.apply(instance.this, instance.args)
			instances.splice(instances.indexOf(instance), 1)
		},
		time
	)

	if(timeout && !instance.timeoutTimer){
		instance.timeoutTimer = setTimeout(
			() => {
				clearTimeout(instance.timer)
				instance.call.apply(instance.this, instance.args)
				instances.splice(instances.indexOf(instance), 1)
			},
			timeout
		)
	}
}