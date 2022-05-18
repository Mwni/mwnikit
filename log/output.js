const colors = {
	red: '31m',
	green: '32m',
	yellow: '33m',
	blue: '34m',
	cyan: '36m',
}

export function std({ level, date, name, color, contents }){
	let func = level === 'E'
		? console.error
		: console.log

	func(`${date} ${level} [\x1b[${colors[color]}${name}\x1b[0m]`, ...contents)
}