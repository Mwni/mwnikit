const colors = {
	red: '31m',
	green: '32m',
	yellow: '33m',
	blue: '34m',
	cyan: '36m',
	magenta: '35m',
	pink: '38;5;197m',
	gray: '38;5;240m',
}

export function std({ level, date, name, color, contents }){
	let prefix = ''
	let func = level === 'E'
		? console.error
		: console.log

	if(process.versions.bun)
		prefix = '\x1b[0m'

	func(`${prefix}\x1b[${colors.gray}${date}\x1b[0m \x1b[${colors[color]}${level}\x1b[0m [\x1b[${colors[color]}${name}\x1b[0m]`, ...contents)
}