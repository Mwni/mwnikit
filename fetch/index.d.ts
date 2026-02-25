export interface GetOptions {
	url: string
	query?: Record<string, string | number | boolean | null | undefined>
	headers?: Record<string, string>
}

export interface PostOptions {
	url: string
	payload?: unknown
	headers?: Record<string, string>
}

export interface UploadOptions {
	url: string
	data: Document | Blob | BufferSource | FormData | URLSearchParams | ReadableStream<Uint8Array> | string
	headers?: Record<string, string>
	onProgress: (progress: number) => void
}

declare class UploadTask extends Promise<void> {
	abort: () => boolean
}

export function get(options: GetOptions): Promise<unknown>
export function post(options: PostOptions): Promise<unknown>
export function upload(options: UploadOptions): UploadTask
