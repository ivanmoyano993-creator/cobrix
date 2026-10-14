import type { IncomingMessage, ServerResponse } from 'node:http'

import { isOneOf } from '../cobrix/domain/guards.ts'
import { FLASH_TEXT_PARAM, FLASH_TONE_PARAM, HTTP_STATUS, MAX_FORM_BYTES } from './constants/routes.constants.ts'
import { TONES } from './constants/ui.constants.ts'
import type { Flash } from './interfaces/web.interface.ts'

export function sendHtml(res: ServerResponse, status: number, body: string): void {
	send(res, status, body, 'text/html; charset=utf-8')
}

export function send(res: ServerResponse, status: number, body: string, type: string): void {
	res.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body) })
	res.end(body)
}

export function redirect(res: ServerResponse, location: string): void {
	res.writeHead(HTTP_STATUS.SeeOther, { location })
	res.end()
}

export function withFlash(path: string, flash: Flash): string {
	const params = new URLSearchParams({ [FLASH_TEXT_PARAM]: flash.text, [FLASH_TONE_PARAM]: flash.tone })
	return `${path}?${params.toString()}`
}

export function readFlash(url: URL): Flash | undefined {
	const text = url.searchParams.get(FLASH_TEXT_PARAM)
	const tone = url.searchParams.get(FLASH_TONE_PARAM)
	if (!text || tone === null || !isOneOf(TONES, tone)) return undefined
	return { text, tone }
}

export async function readForm(req: IncomingMessage): Promise<URLSearchParams> {
	const chunks: Buffer[] = []
	let size = 0
	for await (const chunk of req) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
		size += buffer.length
		if (size > MAX_FORM_BYTES) throw new Error('El formulario es demasiado grande.')
		chunks.push(buffer)
	}
	return new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
}

export function normalizePath(pathname: string): string {
	let end = pathname.length
	while (end > 1 && pathname[end - 1] === '/') end--
	return pathname.slice(0, end) || '/'
}
