export default function createEmitter(){
	let listeners = []

	return {
		on(type, callback){
			listeners.push({type, callback})
			
			return this
		},
	
		once(type, callback){
			listeners.push({type, callback, once: true})

			return this
		},
	
		off(type, callback){
			listeners = listeners.filter(
				listener => !(
					listener.type === type 
					&& (!callback || callback === listener.callback)
				)
			)

			return this
		},
	
		emit(type, data){
			let listeners = listeners.filter(
				listener => listener.type === type
			)
	
			listeners = listeners.filter(
				listener => !listener.once || !listeners.includes(listener)
			)
	
			for(let { callback } of listeners){
				callback(data)
			}

			return this
		}
	}
}