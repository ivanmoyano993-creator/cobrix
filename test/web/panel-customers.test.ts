import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { RUN_TRIGGER } from '../../src/cobrix/domain/constants/run.constants.ts'
import { startPanel, type PanelHarness } from '../support/panel-harness.ts'

const MANUAL = { dryRun: false, trigger: RUN_TRIGGER.Manual }

describe('panel: Clientes vacío', () => {
	let panel: PanelHarness

	before(async () => {
		panel = await startPanel()
	})

	after(async () => {
		await panel.close()
	})

	it('sin importar todavía, explica cómo traer clientes', async () => {
		const { status, body } = await panel.get('/clientes')
		assert.equal(status, 200)
		assert.match(body, /Todavía no hay clientes/)
		assert.match(body, /href="\/sincronizacion"/)
	})
})

describe('panel: Clientes y expediente', () => {
	let panel: PanelHarness

	before(async () => {
		panel = await startPanel()
		await panel.cobrix.runImport(MANUAL)
	})

	after(async () => {
		await panel.close()
	})

	it('lista los 20 clientes con tipo, deuda y vencimiento más antiguo', async () => {
		const { body } = await panel.get('/clientes')
		assert.equal(body.match(/href="\/clientes\/[^"]+"/g)?.length, 20)
		assert.match(body, /COMERCIAL EL FARO, C\.A\./)
		assert.match(body, /Jurídica/)
		assert.match(body, /USD 120,00/)
		assert.match(body, /días de atraso/)
	})

	it('busca por nombre, cédula o RIF y dice cuando no hay coincidencias', async () => {
		const byRif = await panel.get(`/clientes?q=${encodeURIComponent('J-40123456-7')}`)
		assert.equal(byRif.body.match(/href="\/clientes\/[^"]+"/g)?.length, 1)
		assert.match(byRif.body, /COMERCIAL EL FARO/)
		assert.match(byRif.body, /value="J-40123456-7"/)
		const byName = await panel.get('/clientes?q=gomez')
		assert.match(byName.body, /LUIS GOMEZ/)
		const none = await panel.get('/clientes?q=nadie')
		assert.match(none.body, /Ningún cliente coincide con «nadie»/)
	})

	it('el expediente muestra datos, contratos, facturas e historial', async () => {
		const { status, body } = await panel.get('/clientes/V9876543')
		assert.equal(status, 200)
		assert.match(body, /LUIS GOMEZ/)
		assert.match(body, /Persona natural/)
		assert.match(body, /900102/)
		assert.match(body, /900103/)
		assert.match(body, /CORTADO/)
		assert.match(body, /COB-\d{6}/)
		assert.match(body, /Administrador de facturas/)
		assert.match(body, /Cliente creado/)
		assert.match(body, /Factura importada/)
		assert.match(body, /USD 115,00/)
	})

	it('una factura pagada en el ISP muestra la fecha y la factura del administrador que la pagó', async () => {
		const response = await fetch(`${panel.apiBase}/__sim/pagar`, { method: 'POST', body: JSON.stringify({ id_contrato: 900104 }) })
		const payment: { num_factura: string } = await response.json()
		await panel.cobrix.runUpdatePaid(MANUAL)
		const { body } = await panel.get('/clientes/J401234567')
		assert.match(body, /Pagada/)
		assert.ok(body.includes(payment.num_factura))
		assert.match(body, /Pagada en el ISP/)
	})

	it('un cliente que no existe responde 404 con camino de vuelta', async () => {
		const { status, body } = await panel.get('/clientes/V00000001')
		assert.equal(status, 404)
		assert.match(body, /Clientes/)
	})
})
