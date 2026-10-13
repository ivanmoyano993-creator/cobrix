import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

import { SANDBOX_API_USER, seedBillingApi } from '../../src/billing-api/seed.ts'
import { createBillingApiServer, type BillingApiServer } from '../../src/billing-api/server.ts'
import { RUN_COUNTER } from '../../src/cobrix/application/constants/run.constants.ts'
import { runImport } from '../../src/cobrix/application/import-run.ts'
import type { ImportRunDeps } from '../../src/cobrix/application/interfaces/run.interface.ts'
import { runUpdatePaid } from '../../src/cobrix/application/update-paid-run.ts'
import { CONTRACT_REJECTION, INSTALLMENT_EXCLUSION } from '../../src/cobrix/domain/constants/import.constants.ts'
import { PAYMENT_OUTCOME } from '../../src/cobrix/domain/constants/payment.constants.ts'
import { RUN_ITEM_OUTCOME, RUN_STATUS, RUN_TRIGGER } from '../../src/cobrix/domain/constants/run.constants.ts'
import { DEFAULT_SETTINGS } from '../../src/cobrix/domain/constants/settings.constants.ts'
import type { Invoice } from '../../src/cobrix/domain/interfaces/invoice.interface.ts'
import type { Persistence } from '../../src/cobrix/domain/interfaces/repositories.interface.ts'
import type { Run } from '../../src/cobrix/domain/interfaces/run.interface.ts'
import { createHttpBillingProvider } from '../../src/cobrix/infrastructure/http/http-billing-provider.ts'
import { createSqlitePersistence } from '../../src/cobrix/infrastructure/persistence/sqlite-persistence.ts'
import { currentPeriod } from '../../src/shared/dates.ts'

process.env.SANDBOX_TODAY = '2026-10-13'

const MANUAL = { dryRun: false, trigger: RUN_TRIGGER.Manual }
const DRY_RUN = { dryRun: true, trigger: RUN_TRIGGER.Manual }

const NOT_CUSTOMERS = ['CARLOS ROJAS', 'ROSA DIAZ', 'PEDRO LEON', 'ANDRES VARGAS', 'LAURA MENDEZ', 'JORGE CASTILLO']

function totalCents(invoices: readonly Invoice[]): number {
	return invoices.reduce((sum, invoice) => sum + invoice.balanceCents, 0)
}

describe('criterios de aceptación (ENUNCIADO §5) contra la API simulada', () => {
	let dir: string
	let api: BillingApiServer
	let apiBase: string
	let persistence: Persistence
	let deps: ImportRunDeps

	async function cashier(path: string, body: Record<string, number>): Promise<{ id_factura: number }> {
		const response = await fetch(`${apiBase}/__sim/${path}`, { method: 'POST', body: JSON.stringify(body) })
		assert.equal(response.status, 200, `${path} ${JSON.stringify(body)}`)
		const json: { id_factura: number } = await response.json()
		return json
	}

	function openOf(contractId: number): Invoice[] {
		return persistence.invoices.listOpen().filter(invoice => invoice.contractId === contractId)
	}

	before(async () => {
		dir = mkdtempSync(join(tmpdir(), 'cobrix-acceptance-'))
		seedBillingApi(join(dir, 'billing-api.sqlite'))
		api = createBillingApiServer(join(dir, 'billing-api.sqlite'))
		apiBase = `http://127.0.0.1:${await api.listen(0)}`
		persistence = createSqlitePersistence({ path: join(dir, 'cobrix.sqlite'), secretKey: randomBytes(32) })
		persistence.settings.save({
			...DEFAULT_SETTINGS,
			provider: { baseUrl: `${apiBase}/api/v1`, username: SANDBOX_API_USER.user_name, password: SANDBOX_API_USER.password },
		})
		deps = { ...persistence, providerFor: config => createHttpBillingProvider(config), clock: { now: () => new Date().toISOString(), currentPeriod } }
	})

	after(async () => {
		persistence.close()
		await api.close()
		rmSync(dir, { recursive: true, force: true })
	})

	describe('importación desde Cobrix vacío', () => {
		it('simular: 42 cuotas se importarían y no se crea nada', async () => {
			const run = await runImport(deps, DRY_RUN)
			assert.equal(run.status, RUN_STATUS.Completed, run.error ?? '')
			assert.equal(run.counters[RUN_ITEM_OUTCOME.Imported], 42)
			assert.equal(persistence.invoices.listOpen().length, 0)
		})

		it('importar: 20 clientes y 42 facturas abiertas por USD 1.235,00', async () => {
			const run = await runImport(deps, MANUAL)
			assert.equal(run.status, RUN_STATUS.Completed, run.error ?? '')
			assert.equal(run.counters[RUN_ITEM_OUTCOME.Imported], 42)
			assert.equal(run.counters[RUN_COUNTER.CustomersCreated], 20)
			assert.equal(run.counters[RUN_COUNTER.ImportedAmountCents], 123_500)
			assert.match(run.summary ?? '', /USD 1\.235,00/)
			const open = persistence.invoices.listOpen()
			assert.equal(open.length, 42)
			assert.equal(totalCents(open), 123_500)
			assert.equal(new Set(open.map(invoice => invoice.customerId)).size, 20)
		})

		it('excluidas: 9 cuotas por estado, 1 contrato por moneda incoherente y 1 saldo residual', async () => {
			const run = await runImport(deps, DRY_RUN)
			assert.equal(run.counters[CONTRACT_REJECTION.ExcludedStatus], 9)
			assert.equal(run.counters[`contracts_${CONTRACT_REJECTION.IncoherentCurrency}`], 1)
			assert.equal(run.counters[INSTALLMENT_EXCLUSION.ResidualBalance], 1)
		})

		it('importar otra vez: 0 facturas nuevas', async () => {
			const run = await runImport(deps, MANUAL)
			assert.equal(run.counters[RUN_ITEM_OUTCOME.Imported] ?? 0, 0)
			assert.equal(run.counters[RUN_ITEM_OUTCOME.AlreadyImported], 42)
			assert.equal(run.counters[RUN_COUNTER.CustomersCreated] ?? 0, 0)
			assert.equal(persistence.invoices.listOpen().length, 42)
		})

		it('LUIS GOMEZ es 1 cliente con 2 contratos', () => {
			const luis = persistence.invoices.listOpen().filter(invoice => invoice.customerName === 'LUIS GOMEZ')
			assert.deepEqual(new Set(luis.map(invoice => invoice.customerId)), new Set(['V9876543']))
			assert.deepEqual(new Set(luis.map(invoice => invoice.contractId)), new Set([900102, 900103]))
		})

		it('ELENA RUIZ (09000123) tiene ID de cliente 9000123', () => {
			const elena = persistence.invoices.listOpen().filter(invoice => invoice.customerName === 'ELENA RUIZ')
			assert.ok(elena.length > 0)
			assert.ok(elena.every(invoice => invoice.customerId === '9000123'))
		})

		it('no son clientes: cortesía, retirado, rechazado, anulado, sin deuda y moneda incoherente', () => {
			const names = new Set(persistence.invoices.listOpen().map(invoice => invoice.customerName))
			for (const name of NOT_CUSTOMERS) assert.equal(names.has(name), false, name)
		})
	})

	describe('pagos en la caja del ISP y actualizar pagadas', () => {
		let update: Run

		before(async () => {
			await cashier('pagar', { id_contrato: 900101 })
			await cashier('pagar', { id_contrato: 900103, monto: 25 })
			await cashier('pagar', { id_contrato: 900104 })
			await cashier('pagar', { id_contrato: 900114, monto: 70 })
			const elena = await cashier('pagar', { id_contrato: 900113 })
			await cashier('anular', { id_factura: elena.id_factura })
		})

		it('simular la actualización no cambia nada', async () => {
			const run = await runUpdatePaid(deps, DRY_RUN)
			assert.equal(run.counters[PAYMENT_OUTCOME.Paid], 8)
			assert.equal(persistence.invoices.listOpen().length, 42)
		})

		it('8 facturas pagadas y 34 abiertas por USD 955,00', async () => {
			update = await runUpdatePaid(deps, MANUAL)
			assert.equal(update.status, RUN_STATUS.Completed, update.error ?? '')
			assert.equal(update.counters[PAYMENT_OUTCOME.Paid], 8)
			const open = persistence.invoices.listOpen()
			assert.equal(open.length, 34)
			assert.equal(totalCents(open), 95_500)
		})

		it('ANA PEREZ (900101): sus 3 facturas pagadas', () => {
			assert.equal(openOf(900101).length, 0)
		})

		it('LUIS GOMEZ (900103): 1 pagada y la siguiente sigue abierta como abono parcial', () => {
			const open = openOf(900103)
			assert.equal(open.length, 3)
			assert.equal(open[0]?.balanceCents, 2000)
			const partial = update.items.find(item => item.externalId === open[0]?.externalId)
			assert.equal(partial?.outcome, PAYMENT_OUTCOME.PartialPayment)
			assert.match(partial?.detail ?? '', /USD 15,00/)
		})

		it('COMERCIAL EL FARO (900104): sus 2 facturas pagadas', () => {
			assert.equal(openOf(900104).length, 0)
		})

		it('MIGUEL ANGEL SOTO (900114): sus 2 cuotas más viejas pagadas', () => {
			const open = openOf(900114)
			assert.equal(open.length, 6)
			assert.equal(open[0]?.period, '2026-05')
		})

		it('ELENA RUIZ (900113): pago anulado, sus facturas siguen abiertas', () => {
			assert.equal(openOf(900113).length, 2)
		})

		it('repetir la actualización no cambia nada', async () => {
			const run = await runUpdatePaid(deps, MANUAL)
			assert.equal(run.counters[PAYMENT_OUTCOME.Paid] ?? 0, 0)
			assert.equal(persistence.invoices.listOpen().length, 34)
			assert.equal(totalCents(persistence.invoices.listOpen()), 95_500)
		})
	})
})
