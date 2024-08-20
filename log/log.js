import { humanDuration } from './time.js'
import { trace, diff, pin } from './trace.js'
import { std } from './output.js'


const defaultColor = 'yellow'
const levelCascades = {
	D: ['debug'],
	I: ['debug', 'info'],
	W: ['debug', 'info', 'warn'],
	E: ['debug', 'info', 'warn', 'error'],
}


export function create(config = {}){
	let logger
	let accumulations = {}
	let timings = {}
	let pipe
	let output = std

	function configure({ root, trace, ...other }){
		Object.assign(config, {
			...other,
			root: root && trace
				? pin(root, trace)
				: undefined
		})
	}

	function write({ level, args, trace }){
		let name = config.name
		let color = config.color
		let severity = config.severity
		let root = config.root

		if(severity && !levelCascades[level].includes(severity))
			return

		if(pipe){
			pipe({ level, args, trace })
			return
		}

		let path = []

		if(name)
			path.push(name)

		if(root){
			let { name: diffName } = diff(root, trace)

			path.push(diffName)
			
			if(!color)
				color = 'cyan'
		}else{
			path.push(trace.name)
		}

		output({
			level,
			name: path
				.map(piece => piece.replace('\\', '/'))
				.join('/'),

			date: new Date()
				.toISOString()
				.slice(0,19)
				.replace('T', ' '),

			color: level === 'E'
				? 'red'
				: color || defaultColor,

			contents: args.map(arg => {
				if(typeof arg === 'number')
					return arg.toLocaleString('en-US')
			
				if(arg && arg.stack)
					return arg.stack
			
				return arg
			})
		})
	}

	function time({ level, trace, key, contents }){
		if(timings[key]){
			let time = process.hrtime(timings[key])
			let timeInMs = (time[0] * 1000000000 + time[1]) / 1000000
			let duration = humanDuration(timeInMs, 1)

			write({
				level, 
				trace,
				args: contents.map(
					arg => typeof arg === 'string'
						? arg.replace('%', duration)
						: arg
				)
			})

			delete timings[key]
		}else{
			timings[key] = process.hrtime()

			if(contents.length > 0)
				write({ level, trace, args: contents })
		}
	}

	function accumulate({ level, trace, args: {id, text, data = {}, timeout = 10000} }){
		if(!id){
			id = Object.keys(data).join('+')
		}

		let accumulation = accumulations[id]

		if(!accumulation){
			accumulations[id] = accumulation = {
				start: Date.now(),
				timeout,
				data: {},
				flush: () => {
					let data = { 
						...accumulation.data, 
						time: humanDuration(Date.now() - accumulation.start) 
					}

					clearTimeout(accumulation.timer)
	
					write({
						level,
						trace,
						args: accumulation.text.map(piece => {
							for(let [k, v] of Object.entries(data)){
								if(typeof(piece) === 'string')
									piece = piece.replace(`%${k}`, v.toLocaleString('en-US'))
							}
		
							return piece
						})
					})
	
					delete accumulations[id]
				}
			}

			accumulation.timer = setTimeout(accumulation.flush, timeout)
		}
		
		for(let [k, v] of Object.entries(data)){
			accumulation.data[k] = (accumulation.data[k] || 0) + v
		}
		
		accumulation.text = text

		if(Date.now() - accumulation.start >= timeout)
			accumulation.flush()
	}

	configure({
		...config, 
		trace: trace()
	})

	return logger = {
		config({ name, color, severity, root }){
			configure({ 
				name,
				color,
				severity,
				root,
				trace: trace()
			})
			return logger
		},
		fork(branchConfig){
			return create({
				...config,
				...branchConfig,
			})
		},
		branch(branchConfig){
			return create({
				...config,
				...branchConfig,
				name: `${config.name}/${branchConfig.name}`
			})
		},
		debug(...args){
			write({ level: 'D', args, trace: trace() })
			return logger
		},
		info(...args){
			write({ level: 'I', args, trace: trace() })
			return logger
		},
		warn(...args){
			write({ level: 'W', args, trace: trace() })
			return logger
		},
		error(...args){
			write({ level: 'E', args, trace: trace() })
			return logger
		},
		time: {
			debug(key, ...contents){
				time({ level: 'D', key, contents, trace: trace() })
				return logger
			},
			info(key, ...contents){
				time({ level: 'I', key, contents, trace: trace() })
				return logger
			},
			warn(key, ...contents){
				time({ level: 'W', key, contents, trace: trace() })
				return logger
			},
			error(key, ...contents){
				time({ level: 'E', key, contents, trace: trace() })
				return logger
			}
		},
		accumulate: {
			debug(args){
				accumulate({ level: 'D', args, trace: trace() })
				return logger
			},
			info(args){
				accumulate({ level: 'I', args, trace: trace() })
				return logger
			},
			warn(args){
				accumulate({ level: 'W', args, trace: trace() })
				return logger
			},
			error(args){
				accumulate({ level: 'E', args, trace: trace() })
				return logger
			}
		},
		flush(){
			for(let accumulation of Object.values(accumulations)){
				accumulation.flush()
			}
			return logger
		},
		write(line){
			write(line)
			return logger
		},
		pipe(logger){
			pipe = logger.write
			return logger
		}
	}
}