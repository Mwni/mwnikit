import { humanDuration } from './time.js'
import { trace, diff } from './trace.js'
import { std } from './output.js'


const levelCascades = {
	D: ['debug'],
	I: ['debug', 'info'],
	W: ['debug', 'info', 'warn'],
	E: ['debug', 'info', 'warn', 'error'],
}


export function create(config){
	let accumulation
	let traceBase
	let timings = {}
	let pipe
	let output = std


	function applyConfig(newConfig){
		config = {
			name: newConfig.name,
			color: newConfig.color || 'yellow',
			severity: newConfig.severity || 'debug'
		}
	}


	function write({ level, args, trace }){
		let name = config.name
		let color = config.color
		let severity = config.severity

		if(!levelCascades[level].includes(severity))
			return

		if(pipe){
			pipe({ level, args, trace })
			return
		}

		if(!name){
			if(traceBase){
				let { name: diffName, root } = diff(traceBase, trace)

				name = diffName
				
				if(!root)
					color = 'cyan'
			}else{
				name = trace.name
			}
		}

		output({
			level,
			name,

			date: new Date()
				.toISOString()
				.slice(0,19)
				.replace('T', ' '),

			color: level === 'E'
				? 'red'
				: color,

			contents: args.map(arg => {
				if(typeof arg === 'number')
					return arg.toLocaleString('en-US')
			
				if(arg && arg.stack)
					return arg.stack
			
				return arg
			})
		})
	}

	function time(level, key, ...contents){
		if(timings[key]){
			let time = process.hrtime(timings[key])
			let timeInMs = (time[0] * 1000000000 + time[1]) / 1000000
			let duration = humanDuration(timeInMs, 1)

			log(
				level, 
				...contents.map(
					arg => typeof arg === 'string'
						? arg.replace('%', duration)
						: arg
				)
			)

			delete timings[key]
		}else{
			timings[key] = process.hrtime()

			if(contents.length > 0)
				log(level, ...contents)
		}
	}

	function accumulate({ level, trace, data: {line, timeout = 10000, ...values} }){
		if(!accumulation){
			accumulation = {
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
						args: accumulation.line.map(piece => {
							for(let [k, v] of Object.entries(data)){
								if(typeof(piece) === 'string')
									piece = piece.replace(`%${k}`, v.toLocaleString('en-US'))
							}
		
							return piece
						})
					})
	
					accumulation = undefined
				}
			}

			accumulation.timer = setTimeout(accumulation.flush, timeout)
		}
		
		for(let [k, v] of Object.entries(values)){
			accumulation.data[k] = (accumulation.data[k] || 0) + v
		}
		
		accumulation.line = line
	}

	applyConfig(config)

	return {
		config(newConfig){
			traceBase = trace()
			applyConfig(newConfig)
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
				name: `${name}/${branchConfig.name}`
			})
		},
		debug(...args){
			write({ level: 'D', args, trace: trace() })
		},
		info(...args){
			write({ level: 'I', args, trace: trace() })
		},
		warn(...args){
			write({ level: 'W', args, trace: trace() })
		},
		error(...args){
			write({ level: 'E', args, trace: trace() })
		},
		time: {
			debug(...contents){
				time('I', ...contents)
			},
			info(...contents){
				time('I', ...contents)
			},
			warn(...contents){
				time('I', ...contents)
			},
			error(...contents){
				time('I', ...contents)
			}
		},
		accumulate: {
			debug(data){
				accumulate({ level: 'D', data, trace: trace() })
			},
			info(data){
				accumulate({ level: 'I', data, trace: trace() })
			},
			warn(data){
				accumulate({ level: 'W', data, trace: trace() })
			},
			error(data){
				accumulate({ level: 'E', data, trace: trace() })
			}
		},
		flush(){
			if(accumulation)
				accumulation.flush()
		},
		write(line){
			write(line)
		},
		pipe(logger){
			pipe = logger.write
		}
	}
}