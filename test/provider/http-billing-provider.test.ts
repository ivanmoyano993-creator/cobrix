import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

import { SANDBOX_API_USER, seedBillingApi } from '../../src/billing-api/seed.ts'
import { createBillingApiServer, type BillingApiServer } from '../../src/billing-api/server.ts'
import { PROVIDER_ERROR_KIND } from '../../src/cobrix/provider/constants/provider.constants.ts'
import { createHttpBillingProvider } from '../../src/cobrix/provider/http-billing-provider.ts'
import type { ProviderConfig } from '../../src/cobrix/provider/interfaces/provider.interface.ts'
import { ProviderError } from '../../src/cobrix/provider/provider-error.ts'
import type { ProviderErrorKind } from '../../src/cobrix/provider/types/provider.types.ts'

process.env.SANDBOX_TODAY = '2026-10-13'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

async function assertProviderError(action: Promise<object>, kind: ProviderErrorKind, message?: RegExp): Promise<void> {
	await assert.rejects(action, (error: Error) => {
		assert.ok(error instanceof ProviderError, String(error))
		assert.equal(error.kind, kind)
		if (message) assert.match(error.message, message)
		return true
	})
}

describe('createHttpBillingProvider (contra la API simulada)', () => {
	let dir: string
	let api: BillingApiServer
	let config: ProviderConfig

	before(async () => {
		dir = mkdtempSync(join(tmpdir(), 'cobrix-provider-'))
		seedBillingApi(join(dir, 'billing-api.sqlite'))
		api = createBillingApiServer(join(dir, 'billing-api.sqlite'))
		const port = await api.listen(0)
		config = { baseUrl: `http://127.0.0.1:${port}/api/v1`, username: SANDBOX_API_USER.user_name, password: SANDBOX_API_USER.password }
	})

	after(async () => {
		await api.close()
		rmSync(dir, { recursive: true, force: true })
	})

	it('lista todos los contratos, no solo los activos', async () => {
		const ids = await createHttpBillingProvider(config).listContractIds()
		assert.equal(ids.length, 27)
		assert.ok(ids.includes(900106), 'el contrato en cortesía también se lista')
	})

	it('trae las cuotas pendientes de un contrato en el modelo del dominio', async () => {
		const lines = await createHttpBillingProvider(config).getContractDebt(900101)
		assert.deepEqual(lines.map(line => line.debtId).toSorted(), ['7000008', '7000009', '7000010'])
		assert.ok(lines.every(line => line.contractId === 900101 && line.planPrice === 25 && line.currency === 'USD'))
	})

	it('un contrato sin deuda llega como la fila con deuda_id "0"', async () => {
		const lines = await createHttpBillingProvider(config).getContractDebt(900109)
		assert.deepEqual(lines.map(line => [line.debtId, line.debt]), [['0', 0]])
	})

	it('trae el libro de cuotas del rango pedido', async () => {
		const ledger = await createHttpBillingProvider(config).getLedger(900101, { from: '2026-03-01', to: '2026-10-31' })
		assert.ok(ledger.length > 0)
		assert.ok(ledger.every(entry => entry.payment.contractId === 900101 && entry.issuedOn >= '2026-03-01' && entry.issuedOn <= '2026-10-31'))
		assert.ok(ledger.some(entry => entry.payment.installmentId === 7000008 && entry.payment.balance === 20))
	})

	it('inicia sesión una sola vez mientras el token vale y otra cuando vence', async () => {
		let logins = 0
		let clock = Date.now()
		const countingFetch: typeof fetch = async (input, init) => {
			if (String(input).endsWith('/usuario/login')) logins++
			return fetch(input, init)
		}
		const provider = createHttpBillingProvider(config, { fetch: countingFetch, now: () => clock })
		await provider.listContractIds()
		await provider.getContractDebt(900101)
		assert.equal(logins, 1)
		clock += TWO_HOURS_MS
		await provider.listContractIds()
		assert.equal(logins, 2)
	})

	it('si la API rechaza el token, inicia sesión otra vez y reintenta una sola vez', async () => {
		let logins = 0
		let rejected = false
		const flakyFetch: typeof fetch = async (input, init) => {
			if (String(input).endsWith('/usuario/login')) logins++
			if (String(input).includes('/isp/') && !rejected) {
				rejected = true
				return Response.json({ detail: { type: 'auth_api', mensaje: 'Token invalido' } }, { status: 401 })
			}
			return fetch(input, init)
		}
		const ids = await createHttpBillingProvider(config, { fetch: flakyFetch }).listContractIds()
		assert.equal(ids.length, 27)
		assert.equal(logins, 2)
	})

	it('credenciales malas: error de autenticación con el mensaje de la API', async () => {
		await assertProviderError(createHttpBillingProvider({ ...config, password: 'mala' }).listContractIds(), PROVIDER_ERROR_KIND.Auth, /Contraseña Incorrecta/)
	})

	it('un contrato que no existe: error HTTP con el mensaje de la API', async () => {
		await assertProviderError(createHttpBillingProvider(config).getContractDebt(999999), PROVIDER_ERROR_KIND.Http, /No se pudo recuperar/)
	})

	it('la API no responde: error de red', async () => {
		const offline = createHttpBillingProvider({ ...config, baseUrl: 'http://127.0.0.1:1/api/v1' })
		await assertProviderError(offline.listContractIds(), PROVIDER_ERROR_KIND.Network)
	})

	it('una respuesta que no es JSON: respuesta inválida', async () => {
		const htmlFetch: typeof fetch = async (input, init) =>
			String(input).endsWith('/usuario/login') ? fetch(input, init) : new Response('<html>mantenimiento</html>', { status: 200 })
		await assertProviderError(createHttpBillingProvider(config, { fetch: htmlFetch }).listContractIds(), PROVIDER_ERROR_KIND.Malformed)
	})
})
