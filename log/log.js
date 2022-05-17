import { humanDuration } from './time.js'
import { pin, locate, based } from './trace.js'


const logColors = {
	red: '31m',
	green: '32m',
	yellow: '33m',
	blue: '34m',
	cyan: '36m',
}

const levelCascades = {
	D: ['debug'],
	I: ['debug', 'info'],
	W: ['debug', 'info', 'warn'],
	E: ['debug', 'info', 'warn', 'error'],
}


export function create(config){
	let name
	let color
	let severity
	let accumulation
	let pinnedTrace
	let timings = {}
	let pipe = {
		std: console.log,
		err: console.error
	}

	function applyConfig(config){
		name = config.name
		color = config.color
		severity = config.severity || 'debug'
	}

	function log(level, ...args){
		if(!levelCascades[level].includes(severity))
			return

		let output = level === 'E'
			? pipe.err
			: pipe.std

		let activeColor = level === 'E'
			? 'red'
			: color || (
				based(pinnedTrace)
					? 'yellow'
					: 'cyan'
			)
		
		let formattedDate = new Date()
			.toISOString()
			.slice(0,19)
			.replace('T', ' ')

		let formattedName = name
			? name
			: locate(pinnedTrace)

		let contents = args.map(arg => {
			if(typeof arg === 'number')
				return arg.toLocaleString('en-US')
		
			if(arg && arg.stack)
				return arg.stack
		
			return arg
		})

		output(`${formattedDate} ${level} [\x1b[${logColors[activeColor]}${formattedName}\x1b[0m]`, ...contents)
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

	function accumulate(level, { line, timeout = 10000, ...values }){
		if(!accumulation){
			accumulation = {
				start: Date.now(),
				timeout,
				data: {}
			}

			setTimeout(() => {
				let data = { ...accumulation.data, time: humanDuration(timeout) }

				log(level, ...accumulation.line.map(piece => {
					for(let [k, v] of Object.entries(data)){
						if(typeof(piece) === 'string')
							piece = piece.replace(`%${k}`, v.toLocaleString('en-US'))
					}

					return piece
				}))

				accumulation = undefined
			}, timeout)
		}
		
		for(let [k, v] of Object.entries(values)){
			accumulation.data[k] = (accumulation.data[k] || 0) + v
		}
		
		accumulation.line = line
	}

	applyConfig(config)

	return {
		config(newConfig){
			pinnedTrace = pin()
			applyConfig(newConfig)
		},
		fork(branchConfig){
			return create({
				color,
				severity,
				...branchConfig,
			})
		},
		branch(branchConfig){
			return create({
				color,
				severity,
				...branchConfig,
				name: `${name}/${branchConfig.name}`
			})
		},
		debug(...contents){
			log('D', ...contents)
		},
		info(...contents){
			log('I', ...contents)
		},
		warn(...contents){
			log('W', ...contents)
		},
		error(...contents){
			log('E', ...contents)
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
			debug(...contents){
				accumulate('I', ...contents)
			},
			info(...contents){
				accumulate('I', ...contents)
			},
			warn(...contents){
				accumulate('I', ...contents)
			},
			error(...contents){
				accumulate('I', ...contents)
			}
		},
		forward: pipe,
		pipe(logger){
			pipe.std = logger.forward.std
			pipe.err = logger.forward.err
		}
	}
}