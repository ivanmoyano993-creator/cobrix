import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { startPanel, type PanelHarness } from '../support/panel-harness.ts'

describe('panel: Resumen, Sincronización y detalle de corrida', () => {
	let panel: PanelHarness

	before(async () => {
		panel = await startPanel()
	})

	after(async () => {
		await panel.close()
	})

	it('el Resumen vacío explica qué hacer y muestra el proveedor configurado', async () => {
		const { status, body } = await panel.get('/')
		assert.equal(status, 200)
		assert.match(body, /Todavía no hay corridas/)
		assert.match(body, /Simular importación/)
		assert.ok(body.includes(`${panel.apiBase}/api/v1`))
		assert.match(body, /ACTIVO, CORTADO/)
		assert.match(body, /Apagada/)
		assert.doesNotMatch(body, /cobrix-sandbox/)
	})

	it('Resumen y Sincronización dicen que simular no modifica datos y deja registro en el historial', async () => {
		for (const path of ['/', '/sincronizacion']) {
			const { body } = await panel.get(path)
			assert.match(body, /no modifica clientes, contratos ni facturas/)
			assert.match(body, /historial de corridas/)
			assert.doesNotMatch(body, /no escribe nada|sin escribir nada/)
		}
	})

	it('el Resumen distingue la fecha fijada del sandbox del día real en Caracas', async () => {
		const { body } = await panel.get('/')
		assert.match(body, /Fecha del sandbox/)
		assert.match(body, /13 oct 2026/)
		assert.doesNotMatch(body, /Fecha de hoy/)
	})

	it('simular importación lleva al detalle de la corrida y no importa nada', async () => {
		const response = await panel.post('/sincronizacion/importar', { simular: '1' })
		await panel.waitIdle()
		assert.equal(response.status, 303)
		assert.match(response.location ?? '', /^\/sincronizacion\/corridas\/\d+/)
		const { body } = await panel.get(response.location ?? '')
		assert.match(body, /Simulación/)
		assert.match(body, /Se importaría/)
		assert.match(body, /42 facturas se importarían por USD 1\.235,00/)
		assert.equal(panel.cobrix.persistence.queries.overview().openInvoices, 0)
	})

	it('importar crea clientes y facturas, y el Resumen muestra los totales', async () => {
		const response = await panel.post('/sincronizacion/importar')
		await panel.waitIdle()
		const { body } = await panel.get(response.location ?? '')
		assert.match(body, /Importación #\d+/)
		assert.match(body, /Importada/)
		assert.match(body, /Excluida por estado/)
		assert.match(body, /Moneda incoherente/)
		const summary = await panel.get('/')
		assert.match(summary.body, /USD 1\.235,00/)
		assert.match(summary.body, /42 facturas importadas/)
		assert.match(summary.body, /<span>Contratos importados<\/span><strong>21<\/strong>/)
	})

	it('el detalle filtra las filas por resultado', async () => {
		const runs = await panel.get('/sincronizacion')
		const id = /\/sincronizacion\/corridas\/(\d+)/.exec(runs.body)?.[1]
		const { body } = await panel.get(`/sincronizacion/corridas/${id}?resultado=excluded_status`)
		assert.match(body, /CARLOS ROJAS/)
		assert.doesNotMatch(body, /<td[^>]*>ANA PEREZ<\/td>/)
	})

	it('actualizar pagadas sin pagos nuevos deja todo abierto', async () => {
		const response = await panel.post('/sincronizacion/actualizar-pagadas')
		await panel.waitIdle()
		const { body } = await panel.get(response.location ?? '')
		assert.match(body, /Actualización de pagadas #\d+/)
		assert.match(body, /0 facturas marcadas pagadas/)
		assert.match(body, /Sin cambios/)
	})

	it('Sincronización lista el historial de corridas con tipo, simulación y estado', async () => {
		const { body } = await panel.get('/sincronizacion')
		assert.match(body, /Historial de corridas/)
		assert.match(body, /Importación/)
		assert.match(body, /Actualización de pagadas/)
		assert.match(body, /Simulación/)
		assert.match(body, /Completada/)
	})

	it('una corrida que falla queda registrada con el error y cómo seguir', async () => {
		const settings = panel.cobrix.persistence.settings.get()
		panel.cobrix.persistence.settings.save({ ...settings, provider: { ...settings.provider, password: 'mala' } })
		const response = await panel.post('/sincronizacion/importar')
		await panel.waitIdle()
		const { body } = await panel.get(response.location ?? '')
		assert.match(body, /Falló/)
		assert.match(body, /Contraseña Incorrecta/)
		assert.match(body, /Configuración/)
		panel.cobrix.persistence.settings.save(settings)
	})

	it('una corrida que no existe responde 404 con un camino de vuelta', async () => {
		const { status, body } = await panel.get('/sincronizacion/corridas/9999')
		assert.equal(status, 404)
		assert.match(body, /Sincronización/)
	})
})
