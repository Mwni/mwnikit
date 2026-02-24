export type LogLevel = 'D' | 'I' | 'W' | 'E'

export type LogLevelName = 'debug' | 'info' | 'warn' | 'error'

export interface LogColors {
	D?: string
	I?: string
	W?: string
	E?: string
}

export interface TraceInfo {
	dir?: string
	file: string
	name: string
	stack: string[]
}

export interface LogWriteInput {
	level: LogLevel
	args: unknown[]
	trace: TraceInfo
	root?: string
}

export interface LogConfig {
	name?: string
	colors?: LogColors
	level?: LogLevelName
	root?: string
}

export interface LogTimeMethods {
	debug(key: string, ...contents: unknown[]): Logger
	info(key: string, ...contents: unknown[]): Logger
	warn(key: string, ...contents: unknown[]): Logger
	error(key: string, ...contents: unknown[]): Logger
}

export interface LogAccumulateInput {
	id?: string
	text: unknown[]
	data?: Record<string, number>
	timeout?: number
}

export interface LogAccumulateMethods {
	debug(args: LogAccumulateInput): Logger
	info(args: LogAccumulateInput): Logger
	warn(args: LogAccumulateInput): Logger
	error(args: LogAccumulateInput): Logger
}

export interface Logger {
	config(config: LogConfig): Logger
	fork(branchConfig?: LogConfig): Logger
	branch(branchConfig: LogConfig & { name: string }): Logger
	debug(...args: unknown[]): Logger
	info(...args: unknown[]): Logger
	warn(...args: unknown[]): Logger
	error(...args: unknown[]): Logger
	time: LogTimeMethods
	accumulate: LogAccumulateMethods
	flush(): Logger
	write(line: LogWriteInput): Logger
	pipe(logger: { write: (line: LogWriteInput) => unknown }): Logger
}

export function create(config?: LogConfig): Logger

declare const log: Logger & {
	new: typeof create
}

export default log
