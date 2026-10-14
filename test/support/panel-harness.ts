import { mkdtempSync, rmSync } from 'node:fs'
import type { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SANDBOX_API_USER, seedBillingApi } from '../../src/billing-api/seed.ts'
import { createBillingApiServer, type BillingApiServer } from '../../src/billing-api/server.ts'
import { createCobrix } from '../../src/cobrix/bootstrap.ts'
import type { Cobrix } from '../../src/cobrix/infrastructure/interfaces/bootstrap.interface.ts'
import { createApp } from '../../src/web/app.ts'

export interface PanelHarness {
	readonly base: string
	readonly apiBase: string
	readonly cobrix: Cobrix
	get(path: string): Promise<{ status: number; body: string }>
	post(path: string, form?: Record<string, string>): Promise<{ status: number; location: string | null }>
	waitIdle(): Promise<void>
	close(): Promise<void>
}

export interface PanelOptions {
	readonly latencyMs?: number
}

export async function startPanel(options: PanelOptions = {}): Promise<PanelHarness> {
	process.env.SANDBOX_TODAY = '2026-10-13'
	const dir = mkdtempSync(join(tmpdir(), 'cobrix-panel-'))
	seedBillingApi(join(dir, 'billing-api.sqlite'))
	const api: BillingApiServer = createBillingApiServer(join(dir, 'billing-api.sqlite'))
	const apiBase = `http://127.0.0.1:${await api.listen(0)}`
	const cobrix = createCobrix({
		dataDir: join(dir, 'cobrix'),
		secretKeyEnv: undefined,
		defaultProvider: { baseUrl: `${apiBase}/api/v1`, username: SANDBOX_API_USER.user_name, password: SANDBOX_API_USER.password },
		simulatedLatencyMs: options.latencyMs ?? 0,
	})
	const app: Server = createApp({ cobrix, simulatorUrl: apiBase, assignmentPath: fileURLToPath(new URL('../../docs/ENUNCIADO.md', import.meta.url)) })
	await new Promise<void>(resolve => app.listen(0, '127.0.0.1', resolve))
	const address = app.address()
	const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`

	return {
		base,
		apiBase,
		cobrix,
		async get(path) {
			const response = await fetch(`${base}${path}`)
			return { status: response.status, body: await response.text() }
		},
		async post(path, form = {}) {
			const response = await fetch(`${base}${path}`, { method: 'POST', body: new URLSearchParams(form), redirect: 'manual' })
			return { status: response.status, location: response.headers.get('location') }
		},
		async waitIdle() {
			while (cobrix.isRunning()) await new Promise(resolve => setTimeout(resolve, 5))
		},
		async close() {
			while (cobrix.isRunning()) await new Promise(resolve => setTimeout(resolve, 5))
			await new Promise(resolve => app.close(resolve))
			cobrix.close()
			await api.close()
			rmSync(dir, { recursive: true, force: true })
		},
	}
}
