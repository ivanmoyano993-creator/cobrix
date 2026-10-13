import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { RUN_COUNTER } from '../../src/cobrix/application/constants/run.constants.ts'
import { runImport } from '../../src/cobrix/application/import-run.ts'
import type { Clock } from '../../src/cobrix/application/interfaces/run.interface.ts'
import { runUpdatePaid } from '../../src/cobrix/application/update-paid-run.ts'
import { HISTORY_EVENT } from '../../src/cobrix/domain/constants/history.constants.ts'
import { INVOICE_STATUS } from '../../src/cobrix/domain/constants/invoice.constants.ts'
import { PAYMENT_OUTCOME } from '../../src/cobrix/domain/constants/payment.constants.ts'
import { PROVIDER_ERROR_KIND } from '../../src/cobrix/domain/constants/provider.constants.ts'
import { RUN_ITEM_OUTCOME, RUN_STATUS, RUN_TRIGGER } from '../../src/cobrix/domain/constants/run.constants.ts'
import type { DebtLine } from '../../src/cobrix/domain/interfaces/import.interface.ts'
import type { LedgerEntry } from '../../src/cobrix/domain/interfaces/payment.interface.ts'
import { ProviderError } from '../../src/cobrix/domain/provider-error.ts'
import { createFakeProvider, debtLine, type FakeProviderData, ledgerEntry } from '../support/fake-provider.ts'
import { createTestPersistence, type TestPersistence } from '../support/test-persistence.ts'

const CLOCK: Clock = { now: () => '2026-10-13T14:00:00.000Z', currentPeriod: () => '2026-10' }
const MANUAL = { dryRun: false, trigger: RUN_TRIGGER.Manual }
const DRY_RUN = { dryRun: true, trigger: RUN_TRIGGER.Manual }

const DEBTS = new Map<number, readonly DebtLine[]>([
	[900101, [debtLine(900101, '2026-08', 20, '7000008'), debtLine(900101, '2026-09', 25, '7000009'), debtLine(900101, '2026-10', 25, '7000010')]],
	[900104, [debtLine(900104, '2026-10', 25, '7000040', { holderDocument: 'J-40123456-7', holderName: 'COMERCIAL EL FARO, C.A.' })]],
])

const PAID_LEDGER = new Map<number, readonly LedgerEntry[]>([
	[900101, [
		ledgerEntry(900101, { installmentId: 7000008, period: '2026-08', invoiceId: 8800007, issuedOn: '2026-08-06', balance: 0, paid: 25 }),
		ledgerEntry(900101, { installmentId: 7000008, period: '2026-08', invoiceId: 8800120, issuedOn: '2026-10-13', balance: 0, paid: 25 }),
		ledgerEntry(900101, { installmentId: 7000009, period: '2026-09', invoiceId: 8800121, issuedOn: '2026-10-13', balance: 15, paid: 10 }),
		ledgerEntry(900101, { installmentId: 7000010, period: '2026-10', invoiceId: 0, issuedOn: '2026-10-31', balance: 25, paid: 0 }),
	]],
	[900104, [ledgerEntry(900104, { installmentId: 7000040, period: '2026-10', invoiceId: 0, issuedOn: '2026-10-31', balance: 25, paid: 0 })]],
])

describe('runUpdatePaid', () => {
	let context: TestPersistence

	function deps(data: FakeProviderData) {
		const provider = createFakeProvider(data)
		return { ...context.persistence, providerFor: () => provider, clock: CLOCK, provider }
	}

	beforeEach(async () => {
		context = createTestPersistence()
		await runImport(deps({ debts: DEBTS }), MANUAL)
	})

	afterEach(() => {
		context.dispose()
	})

	it('marca pagada solo lo cobrado por completo y lo deja en el historial', async () => {
		const run = await runUpdatePaid(deps({ debts: DEBTS, ledgers: PAID_LEDGER }), MANUAL)
		assert.equal(run.status, RUN_STATUS.Completed)
		assert.equal(run.counters[PAYMENT_OUTCOME.Paid], 1)
		assert.equal(run.counters[PAYMENT_OUTCOME.PartialPayment], 1)
		assert.equal(run.counters[PAYMENT_OUTCOME.Unchanged], 2)
		assert.equal(run.counters[RUN_COUNTER.PaidAmountCents], 2000)
		const paid = context.persistence.invoices.findByExternalId('7000008')
		assert.equal(paid?.status, INVOICE_STATUS.Paid)
		assert.equal(paid?.paidByInvoiceNumber, '008800120')
		const history = context.persistence.history.listByCustomer('V12345678')
		assert.equal(history.at(-1)?.kind, HISTORY_EVENT.InvoicePaid)
		assert.match(history.at(-1)?.detail ?? '', /008800120/)
	})

	it('un abono parcial se informa pero la factura sigue abierta con el mismo saldo', async () => {
		const run = await runUpdatePaid(deps({ debts: DEBTS, ledgers: PAID_LEDGER }), MANUAL)
		const partial = run.items.find(item => item.externalId === '7000009')
		assert.equal(partial?.outcome, PAYMENT_OUTCOME.PartialPayment)
		assert.match(partial?.detail ?? '', /15,00/)
		const invoice = context.persistence.invoices.findByExternalId('7000009')
		assert.equal(invoice?.status, INVOICE_STATUS.Open)
		assert.equal(invoice?.balanceCents, 2500)
	})

	it('simular no cambia nada', async () => {
		const dry = await runUpdatePaid(deps({ debts: DEBTS, ledgers: PAID_LEDGER }), DRY_RUN)
		assert.equal(dry.counters[PAYMENT_OUTCOME.Paid], 1)
		assert.match(dry.summary ?? '', /1 factura se marcaría pagada/)
		assert.equal(context.persistence.invoices.findByExternalId('7000008')?.status, INVOICE_STATUS.Open)
	})

	it('repetir la actualización no cambia nada', async () => {
		await runUpdatePaid(deps({ debts: DEBTS, ledgers: PAID_LEDGER }), MANUAL)
		const again = await runUpdatePaid(deps({ debts: DEBTS, ledgers: PAID_LEDGER }), MANUAL)
		assert.equal(again.counters[PAYMENT_OUTCOME.Paid] ?? 0, 0)
		assert.equal(context.persistence.invoices.listOpen().length, 3)
	})

	it('si la cuota no está en el libro consulta el contrato; si tampoco está ahí, queda sin evidencia', async () => {
		const ledgers = new Map<number, readonly LedgerEntry[]>([[900101, []], [900104, []]])
		const debts = new Map<number, readonly DebtLine[]>([[900101, [debtLine(900101, '2026-10', 25, '7000010')]], [900104, DEBTS.get(900104) ?? []]])
		const context6 = deps({ debts, ledgers })
		const run = await runUpdatePaid(context6, MANUAL)
		const byId = new Map(run.items.map(item => [item.externalId, item.outcome]))
		assert.equal(byId.get('7000008'), PAYMENT_OUTCOME.NoEvidence)
		assert.equal(byId.get('7000010'), PAYMENT_OUTCOME.Unchanged)
		assert.equal(byId.get('7000040'), PAYMENT_OUTCOME.Unchanged)
		assert.equal(context.persistence.invoices.listOpen().length, 4)
	})

	it('solo consulta el contrato cuando el libro no alcanza', async () => {
		const context6 = deps({ debts: DEBTS, ledgers: PAID_LEDGER })
		await runUpdatePaid(context6, MANUAL)
		assert.equal(context6.provider.calls.filter(call => call.startsWith('getContractDebt')).length, 0)
		assert.ok(context6.provider.calls.includes('getLedger:900101:2026-08-01:2026-10-31'))
	})

	it('un contrato con error del ISP queda sin cambios y el resto se procesa', async () => {
		const failures = new Map([[900104, new ProviderError(PROVIDER_ERROR_KIND.Http, 'HTTP 503')]])
		const run = await runUpdatePaid(deps({ debts: DEBTS, ledgers: PAID_LEDGER, failures }), MANUAL)
		assert.equal(run.status, RUN_STATUS.Completed)
		assert.equal(run.items.find(item => item.externalId === '7000040')?.outcome, RUN_ITEM_OUTCOME.ProviderError)
		assert.equal(run.counters[PAYMENT_OUTCOME.Paid], 1)
	})

	it('la API caída hace fallar la corrida y queda registrada', async () => {
		const listFailure = new ProviderError(PROVIDER_ERROR_KIND.Network, 'No se pudo conectar')
		const failures = new Map([[900101, listFailure], [900104, listFailure]])
		const run = await runUpdatePaid(deps({ debts: DEBTS, ledgers: PAID_LEDGER, failures }), MANUAL)
		assert.equal(run.status, RUN_STATUS.Failed)
		assert.match(run.error ?? '', /No se pudo conectar/)
	})
})
