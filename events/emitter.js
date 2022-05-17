export default class EventEmitter{
	constructor(){
		this.listeners = []
	}

	bind(to){
		to.on = this.on.bind(this)
		to.once = this.once.bind(this)
		to.off = this.off.bind(this)
		to.emit = this.emit.bind(this)
		
		return to
	}

	on(type, callback){
		this.listeners.push({type, callback})
		return this
	}

	once(type, callback){
		this.listeners.push({type, callback, once: true})
		return this
	}

	off(type, callback){
		this.listeners = this.listeners
			.filter(listener => !(
				listener.type === type 
				&& (!callback || callback === listener.callback)
			))
	}

	emit(type, data){
		let listeners = this.listeners
			.filter(listener => listener.type === type)

		this.listeners = this.listeners.
			filter(listener => !listener.once || !listeners.includes(listener))

		for(let { callback } of listeners){
			callback(data)
		}
	}
}