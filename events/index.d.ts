export type ListenerCallback<TData = unknown> = (data: TData) => void

export interface ListenerEntry<TData = unknown> {
	callback: ListenerCallback<TData>
	once?: boolean
}

export type ListenerMap<TEvents extends Record<string, unknown>> = {
	[K in keyof TEvents]?: ListenerEntry<TEvents[K]>[]
} & {
	[type: string]: ListenerEntry<unknown>[] | undefined
}

export interface Emitter<TEvents extends Record<string, unknown> = Record<string, unknown>> {
	listeners: ListenerMap<TEvents>
	on<K extends keyof TEvents>(type: K, callback: ListenerCallback<TEvents[K]>): this
	on(type: string, callback: ListenerCallback<unknown>): this
	once<K extends keyof TEvents>(type: K, callback: ListenerCallback<TEvents[K]>): this
	once(type: string, callback: ListenerCallback<unknown>): this
	off(): void
	off<K extends keyof TEvents>(type: K, callback?: ListenerCallback<TEvents[K]>): this
	off(type: string, callback?: ListenerCallback<unknown>): this
	emit<K extends keyof TEvents>(type: K, data: TEvents[K]): this
	emit(type: string, data?: unknown): this | void
}

export default function createEmitter<TEvents extends Record<string, unknown> = Record<string, unknown>>(): Emitter<TEvents>
