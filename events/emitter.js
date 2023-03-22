export default function createEmitter(){
	let listeners = {}

	function add(type, entry){
		if(!listeners[type])
				listeners[type] = []

		listeners[type].push(entry)
	}

	return {
		listeners,

		on(type, callback){
			add(type, { callback })
			return this
		},
	
		once(type, callback){
			add(type, { callback, once: true })
			return this
		},
	
		off(type, callback){
			if(!type){
				for(let key of Object.keys(listeners)){
					delete listeners[key]
				}
				return
			}

			if(!listeners[type])
				return

			if(callback){
				listeners[type] = listeners[type].filter(
					listener => callback !== listener.callback
				)
	
				if(listeners[type].length === 0)
					delete listeners[type]
			}else{
				delete listeners[type]
			}

			return this
		},
	
		emit(type, data){
			if(!listeners[type])
				return

			let matchedListeners = listeners[type].slice()
	
			listeners[type] = listeners[type].filter(
				listener => !listener.once
			)
	
			for(let { callback } of matchedListeners){
				callback(data)
			}

			return this
		}
	}
}