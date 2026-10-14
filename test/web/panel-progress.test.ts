import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { startPanel, type PanelHarness } from '../support/panel-harness.ts'

describe('panel: progreso en vivo de una corrida', () => {
	let panel: PanelHarness

	before(async () => {
		panel = await startPanel({ latencyMs: 25 })
	})

	after(async () => {
		await panel.close()
	})

	it('importar redirige enseguida al detalle, que muestra el avance mientras corre', async () => {
		const response = await panel.post('/sincronizacion/importar')
		assert.equal(response.status, 303)
		const runId = /\/(\d+)$/.exec(response.location ?? '')?.[1]
		const { body } = await panel.get(response.location ?? '')
		assert.match(body, /En curso/)
		assert.match(body, /<progress/)
		assert.doesNotMatch(body, /no dejó filas/)
		assert.ok(body.includes(`data-progress-url="/sincronizacion/corridas/${runId}/progreso"`))
		const sync = await panel.get('/sincronizacion')
		assert.match(sync.body, /Hay una corrida en curso/)
		assert.ok(sync.body.includes(`/sincronizacion/corridas/${runId}`))
		await panel.waitIdle()
	})

	it('el flujo de eventos manda el avance contrato por contrato y avisa el final', async () => {
		const response = await panel.post('/sincronizacion/importar', { simular: '1' })
		const stream = await fetch(`${panel.base}${response.location ?? ''}/progreso`)
		assert.equal(stream.headers.get('content-type'), 'text/event-stream; charset=utf-8')
		const text = await stream.text()
		assert.match(text, /event: progress\ndata: \{[^\n]*"total":27/)
		assert.match(text, /"label":"Contrato 900101"/)
		assert.match(text, /event: finished\n/)
		const { body } = await panel.get(response.location ?? '')
		assert.match(body, /Completada/)
		assert.doesNotMatch(body, /<progress/)
	})

	it('el flujo de una corrida ya terminada avisa el final de inmediato', async () => {
		const text = await (await fetch(`${panel.base}/sincronizacion/corridas/1/progreso`)).text()
		assert.match(text, /^event: finished\n/)
	})

	it('pedir otra corrida mientras corre una vuelve a Sincronización con el aviso', async () => {
		const first = await panel.post('/sincronizacion/importar', { simular: '1' })
		const second = await panel.post('/sincronizacion/actualizar-pagadas')
		assert.equal(second.status, 303)
		const page = await panel.get(second.location ?? '')
		assert.match(page.body, /Ya hay una corrida en curso/)
		assert.ok(first.location)
		await panel.waitIdle()
	})
})
