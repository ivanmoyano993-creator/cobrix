import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { SettingsInput } from '../../src/cobrix/application/interfaces/settings.interface.ts'
import { applySettingsInput } from '../../src/cobrix/application/settings-form.ts'
import { DEFAULT_SETTINGS } from '../../src/cobrix/domain/constants/settings.constants.ts'
import type { Settings } from '../../src/cobrix/domain/interfaces/settings.interface.ts'

const CURRENT: Settings = {
	...DEFAULT_SETTINGS,
	provider: { baseUrl: 'http://127.0.0.1:4310/api/v1', username: 'cobrix', password: 'cobrix-sandbox' },
}

function input(overrides: Partial<SettingsInput> = {}): SettingsInput {
	return {
		companyName: 'Cobrix Venezuela, C.A.',
		companyRif: 'J-12345678-9',
		companyEmail: 'cobranza@cobrix.test',
		providerUrl: 'http://127.0.0.1:4310/api/v1',
		providerUsername: 'cobrix',
		providerPassword: '',
		importableStatuses: ['ACTIVO', 'CORTADO'],
		windowMonths: '',
		maxRecentPerContract: '',
		graceDays: '5',
		maxNewInvoices: '',
		maxNewAmount: '',
		excludedDocumentTypes: [],
		autoRunEnabled: false,
		autoRunTime: '06:00',
		...overrides,
	}
}

function errorsOf(overrides: Partial<SettingsInput>, current: Settings = CURRENT) {
	const result = applySettingsInput(current, input(overrides))
	return result.ok ? {} : result.errors
}

describe('applySettingsInput', () => {
	it('convierte el formulario en la configuración, con montos en centavos y vacíos como «sin límite»', () => {
		const result = applySettingsInput(CURRENT, input({ windowMonths: '6', maxRecentPerContract: '12', maxNewInvoices: '100', maxNewAmount: '1500,50', excludedDocumentTypes: ['J', 'G'], autoRunEnabled: true, autoRunTime: '07:30' }))
		assert.equal(result.ok, true)
		if (!result.ok) return
		assert.deepEqual(result.settings, {
			company: { name: 'Cobrix Venezuela, C.A.', rif: 'J-12345678-9', collectionEmail: 'cobranza@cobrix.test' },
			provider: CURRENT.provider,
			importRules: { importableStatuses: ['ACTIVO', 'CORTADO'], windowMonths: 6, maxRecentPerContract: 12, graceDays: 5, excludedDocumentTypes: ['J', 'G'] },
			caps: { maxNewInvoices: 100, maxNewAmountCents: 150_050 },
			autoRun: { enabled: true, time: '07:30' },
		})
		const empty = applySettingsInput(CURRENT, input())
		assert.ok(empty.ok && empty.settings.importRules.windowMonths === null && empty.settings.caps.maxNewAmountCents === null)
	})

	it('la contraseña vacía conserva la guardada; una nueva la reemplaza', () => {
		const kept = applySettingsInput(CURRENT, input())
		assert.ok(kept.ok && kept.settings.provider.password === 'cobrix-sandbox')
		const replaced = applySettingsInput(CURRENT, input({ providerPassword: 'nueva' }))
		assert.ok(replaced.ok && replaced.settings.provider.password === 'nueva')
		assert.match(errorsOf({}, DEFAULT_SETTINGS).providerPassword ?? '', /contraseña/)
	})

	it('valida el proveedor', () => {
		assert.match(errorsOf({ providerUrl: '' }).providerUrl ?? '', /URL/)
		assert.match(errorsOf({ providerUrl: 'ftp://isp.test' }).providerUrl ?? '', /http/)
		assert.match(errorsOf({ providerUrl: 'no es una url' }).providerUrl ?? '', /URL/)
		assert.match(errorsOf({ providerUsername: '  ' }).providerUsername ?? '', /usuario/)
	})

	it('valida las reglas de importación con los rangos del enunciado', () => {
		assert.match(errorsOf({ importableStatuses: [] }).importableStatuses ?? '', /al menos un estado/)
		assert.ok(errorsOf({ importableStatuses: ['SUSPENDIDO'] }).importableStatuses)
		assert.match(errorsOf({ windowMonths: '5' }).windowMonths ?? '', /3, 6, 9 o 12/)
		assert.match(errorsOf({ maxRecentPerContract: '61' }).maxRecentPerContract ?? '', /1 y 60/)
		assert.ok(errorsOf({ maxRecentPerContract: '0' }).maxRecentPerContract)
		assert.match(errorsOf({ graceDays: '61' }).graceDays ?? '', /0 y 60/)
		assert.ok(errorsOf({ graceDays: '' }).graceDays)
		assert.ok(errorsOf({ graceDays: '2.5' }).graceDays)
		assert.ok(errorsOf({ maxNewInvoices: '0' }).maxNewInvoices)
		assert.ok(errorsOf({ maxNewAmount: '-1' }).maxNewAmount)
		assert.ok(errorsOf({ maxNewAmount: 'mucho' }).maxNewAmount)
		assert.ok(errorsOf({ excludedDocumentTypes: ['X'] }).excludedDocumentTypes)
	})

	it('valida la empresa y la corrida automática', () => {
		assert.ok(errorsOf({ companyEmail: 'no-es-correo' }).companyEmail)
		assert.ok(errorsOf({ companyEmail: 'sin espacios@isp.test' }).companyEmail)
		assert.ok(errorsOf({ companyEmail: 'a@b@isp.test' }).companyEmail)
		assert.ok(errorsOf({ companyEmail: 'cobranza@isp.' }).companyEmail)
		assert.equal(errorsOf({ companyEmail: 'sistemas@isp-servicios.com.ve' }).companyEmail, undefined)
		assert.ok(errorsOf({ companyRif: 'RIF?' }).companyRif)
		assert.deepEqual(errorsOf({ companyName: '', companyRif: '', companyEmail: '' }), {})
		assert.match(errorsOf({ autoRunTime: '25:00' }).autoRunTime ?? '', /HH:MM/)
		assert.ok(errorsOf({ autoRunTime: '7:30' }).autoRunTime)
	})

	it('junta todos los errores a la vez, no solo el primero', () => {
		assert.deepEqual(Object.keys(errorsOf({ providerUrl: '', graceDays: '99', windowMonths: '1' })).toSorted(), ['graceDays', 'providerUrl', 'windowMonths'])
	})
})
