import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'

import { startPanel, type PanelHarness } from '../support/panel-harness.ts'

function form(overrides: Record<string, string> = {}): URLSearchParams {
	const params = new URLSearchParams({
		companyName: 'Cobrix Venezuela, C.A.',
		companyRif: 'J-12345678-9',
		companyEmail: 'cobranza@cobrix.test',
		providerUrl: '',
		providerUsername: 'cobrix',
		providerPassword: '',
		windowMonths: '3',
		maxRecentPerContract: '',
		graceDays: '5',
		maxNewInvoices: '',
		maxNewAmount: '',
		autoRunTime: '07:30',
		...overrides,
	})
	params.append('importableStatuses', 'ACTIVO')
	params.append('importableStatuses', 'CORTADO')
	return params
}

describe('panel: Configuración', () => {
	let panel: PanelHarness

	async function submit(path: string, body: URLSearchParams): Promise<{ status: number; location: string | null; body: string }> {
		const response = await fetch(`${panel.base}${path}`, { method: 'POST', body, redirect: 'manual' })
		return { status: response.status, location: response.headers.get('location'), body: await response.text() }
	}

	before(async () => {
		panel = await startPanel()
	})

	after(async () => {
		await panel.close()
	})

	it('muestra la configuración actual sin revelar la contraseña', async () => {
		const { status, body } = await panel.get('/configuracion')
		assert.equal(status, 200)
		assert.ok(body.includes(`value="${panel.apiBase}/api/v1"`))
		assert.match(body, /value="cobrix"/)
		assert.doesNotMatch(body, /cobrix-sandbox/)
		assert.match(body, /Probar conexión/)
		assert.match(body, /name="importableStatuses" value="ACTIVO" checked/)
	})

	it('la configuración guardada empieza sin cambios pendientes y aclara desde cuándo rigen las reglas', async () => {
		const { body } = await panel.get('/configuracion')
		assert.match(body, /<form class="settings"[^>]*data-dirty="false"/)
		assert.match(body, /data-save/)
		assert.match(body, /Tienes cambios sin guardar/)
		assert.match(body, /desde la próxima importación/)
	})

	it('probar conexión inicia sesión con lo escrito y dice cuántos contratos hay, sin guardar', async () => {
		const response = await submit('/configuracion/probar', form({ providerUrl: `${panel.apiBase}/api/v1`, companyName: 'Sin guardar' }))
		assert.equal(response.status, 200)
		assert.match(response.body, /Conexión correcta: 27 contratos/)
		assert.match(response.body, /value="Sin guardar"/)
		assert.notEqual(panel.cobrix.persistence.settings.get().company.name, 'Sin guardar')
	})

	it('probar conexión con una contraseña mala explica qué pasó', async () => {
		const response = await submit('/configuracion/probar', form({ providerUrl: `${panel.apiBase}/api/v1`, providerPassword: 'mala' }))
		assert.match(response.body, /Contraseña Incorrecta/)
		assert.equal(panel.cobrix.persistence.settings.get().provider.password, 'cobrix-sandbox')
	})

	it('guardar con errores no guarda, marca cada campo y conserva lo escrito', async () => {
		const response = await submit('/configuracion', form({ providerUrl: 'no es url', graceDays: '99', companyName: 'Escrito' }))
		assert.equal(response.status, 422)
		assert.match(response.body, /Revisa los campos marcados/)
		assert.match(response.body, /entre 0 y 60/)
		assert.match(response.body, /value="Escrito"/)
		assert.match(response.body, /<form class="settings"[^>]*data-dirty="true"/)
		assert.notEqual(panel.cobrix.persistence.settings.get().company.name, 'Escrito')
	})

	it('guardar aplica la configuración, conserva la contraseña y se ve en el Resumen', async () => {
		const response = await submit('/configuracion', form({ providerUrl: `${panel.apiBase}/api/v1`, autoRunEnabled: 'on' }))
		assert.equal(response.status, 303)
		assert.match(response.location ?? '', /^\/configuracion\?/)
		const saved = panel.cobrix.persistence.settings.get()
		assert.equal(saved.company.name, 'Cobrix Venezuela, C.A.')
		assert.equal(saved.provider.password, 'cobrix-sandbox')
		assert.equal(saved.importRules.windowMonths, 3)
		assert.deepEqual(saved.autoRun, { enabled: true, time: '07:30' })
		const page = await panel.get(response.location ?? '')
		assert.match(page.body, /Configuración guardada/)
		const summary = await panel.get('/')
		assert.match(summary.body, /mes actual menos 3 meses/)
		assert.match(summary.body, /Activa todos los días a las 07:30/)
		assert.match(summary.body, /Cobrix Venezuela, C\.A\./)
	})
})
