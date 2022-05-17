const timeScalars = [
	1000, 
	60, 
	60, 
	24, 
	7, 
	52
]

const timeUnits = [
	'ms', 
	'seconds', 
	'minutes', 
	'hours', 
	'days', 
	'weeks', 
	'years'
]

export const humanDuration = (ms, dp = 0) => {
	let timeScalarIndex = 0
	let scaledTime = ms

	while (scaledTime > timeScalars[timeScalarIndex]){
		scaledTime /= timeScalars[timeScalarIndex++]
	}

	return `${scaledTime.toFixed(dp)} ${timeUnits[timeScalarIndex]}`
}