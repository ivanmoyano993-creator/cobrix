import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { RUN_COUNTER } from '../../src/cobrix/application/constants/run.constants.ts'
import { runImport } from '../../src/cobrix/application/import-run.ts'
import type { Clock } from '../../src/cobrix/application/interfaces/run.interface.ts'
import { HISTORY_EVENT } from '../../src/cobrix/domain/constants/history.constants.ts'
import { CONTRACT_REJECTION, INSTALLMENT_EXCLUSION } from '../../src/cobrix/domain/constants/import.constants.ts'
import { PROVIDER_ERROR_KIND } from '../../src/cobrix/domain/constants/provider.constants.ts'
import { RUN_ITEM_OUTCOME, RUN_STATUS, RUN_TRIGGER } from '../../src/cobrix/domain/constants/run.constants.ts'
import type { DebtLine } from '../../src/cobrix/domain/interfaces/import.interface.ts'
import type { Settings } from '../../src/cobrix/domain/interfaces/settings.interface.ts'
import { ProviderError } from '../../src/cobrix/domain/provider-error.ts'
import { createFakeProvider, debtLine, type FakeProviderData } from '../support/fake-provider.ts'
import { createTestPersistence, type TestPersistence } from '../support/test-persistence.ts'

const CLOCK: Clock = { now: () => '2026-10-13T14:00:00.000Z', currentPeriod: () => '2026-10' }
const MANUAL = { dryRun: false, trigger: RUN_TRIGGER.Manual }
const DRY_RUN = { dryRun: true, trigger: RUN_TRIGGER.Manual }

const LUIS = { holderDocument: 'V-9876543', holderName: 'LUIS GOMEZ' }

function baseDebts(): Map<number, readonly DebtLine[]> {
	return new Map<number, readonly DebtLine[]>([
		[900101, [debtLine(900101, '2026-09', 25, '7000009'), debtLine(900101, '2026-08', 20, '7000008')]],
		[900102, [debtLine(900102, '2026-10', 35, '7000020', LUIS)]],
		[900103, [debtLine(900103, '2026-10', 20, '7000030', { ...LUIS, status: 'CORTADO' })]],
		[900106, [debtLine(900106, '2026-10', 20, '7000060', { holderDocument: 'V-15111222', holderName: 'CARLOS ROJAS', status: 'CORTESIA' })]],
		[900109, [debtLine(900109, '2026-10', 0, '0', { holderDocument: 'V-18444555', holderName: 'LAURA MENDEZ', debtDetail: [] })]],
		[900111, [debtLine(900111, '2026-09', 0, '7000110', { holderDocument: 'V-20666777', holderName: 'SOFIA TORRES' })]],
	])
}

describe('runImport', () => {
	let context: TestPersistence

	function deps(data: FakeProviderData, settings: Partial<Settings> = {}) {
		if (Object.keys(settings).length > 0) context.persistence.settings.save({ ...context.persistence.settings.get(), ...settings })
		const provider = createFakeProvider(data)
		return { ...context.persistence, providerFor: () => provider, clock: CLOCK }
	}

	beforeEach(() => {
		context = createTestPersistence()
	})

	afterEach(() => {
		context.dispose()
	})

	it('importa cada cuota pendiente como factura abierta y crea un cliente por titular', async () => {
		const run = await runImport(deps({ debts: baseDebts() }), MANUAL)
		assert.equal(run.status, RUN_STATUS.Completed)
		assert.equal(run.counters[RUN_ITEM_OUTCOME.Imported], 4)
		assert.equal(run.counters[RUN_COUNTER.ImportedAmountCents], 2000 + 2500 + 3500 + 2000)
		assert.equal(run.counters[RUN_COUNTER.CustomersCreated], 2)
		assert.equal(run.counters[RUN_COUNTER.ContractsNoDebt], 1)
		assert.deepEqual(context.persistence.invoices.listOpen().map(invoice => invoice.externalId), ['7000008', '7000009', '7000020', '7000030'])
		assert.deepEqual(context.persistence.history.listByCustomer('V9876543').map(event => event.kind), [
			HISTORY_EVENT.CustomerCreated,
			HISTORY_EVENT.InvoiceImported,
			HISTORY_EVENT.InvoiceImported,
		])
	})

	it('deja una fila por cuota con su resultado y motivo', async () => {
		const run = await runImport(deps({ debts: baseDebts() }), MANUAL)
		const byId = new Map(run.items.map(item => [item.externalId, item]))
		assert.equal(byId.get('7000008')?.outcome, RUN_ITEM_OUTCOME.Imported)
		assert.match(byId.get('7000008')?.detail ?? '', /COB-000001/)
		assert.equal(byId.get('7000060')?.outcome, CONTRACT_REJECTION.ExcludedStatus)
		assert.match(byId.get('7000060')?.detail ?? '', /CORTESIA/)
		assert.equal(byId.get('7000110')?.outcome, INSTALLMENT_EXCLUSION.ResidualBalance)
		assert.equal(byId.get('7000008')?.customerName, 'ANA PEREZ')
		assert.equal(run.counters[`contracts_${CONTRACT_REJECTION.ExcludedStatus}`], 1)
	})

	it('simular hace exactamente lo mismo pero no escribe nada', async () => {
		const dry = await runImport(deps({ debts: baseDebts() }), DRY_RUN)
		assert.equal(dry.dryRun, true)
		assert.equal(dry.counters[RUN_ITEM_OUTCOME.Imported], 4)
		assert.match(dry.summary ?? '', /se importarían/)
		assert.equal(context.persistence.invoices.listOpen().length, 0)
		assert.equal(context.persistence.history.listByCustomer('V12345678').length, 0)
		const real = await runImport(deps({ debts: baseDebts() }), MANUAL)
		assert.deepEqual(real.items.map(item => [item.externalId, item.outcome]), dry.items.map(item => [item.externalId, item.outcome]))
	})

	it('es idempotente: importar otra vez no duplica nada', async () => {
		await runImport(deps({ debts: baseDebts() }), MANUAL)
		const second = await runImport(deps({ debts: baseDebts() }), MANUAL)
		assert.equal(second.counters[RUN_ITEM_OUTCOME.Imported] ?? 0, 0)
		assert.equal(second.counters[RUN_ITEM_OUTCOME.AlreadyImported], 4)
		assert.equal(second.counters[RUN_COUNTER.CustomersCreated] ?? 0, 0)
		assert.equal(context.persistence.invoices.listOpen().length, 4)
	})

	it('frena lo que excede los topes por corrida y no lo importa', async () => {
		const run = await runImport(deps({ debts: baseDebts() }, { caps: { maxNewInvoices: 2, maxNewAmountCents: null } }), MANUAL)
		assert.equal(run.counters[RUN_ITEM_OUTCOME.Imported], 2)
		assert.equal(run.counters[RUN_ITEM_OUTCOME.HeldByCap], 2)
		assert.equal(context.persistence.invoices.listOpen().length, 2)
		const next = await runImport(deps({ debts: baseDebts() }), MANUAL)
		assert.equal(next.counters[RUN_ITEM_OUTCOME.Imported], 2)
	})

	it('un contrato con error del ISP queda fuera y la corrida sigue', async () => {
		const failures = new Map([
			[900102, new ProviderError(PROVIDER_ERROR_KIND.Http, 'HTTP 500')],
			[900103, new ProviderError(PROVIDER_ERROR_KIND.Malformed, '«[0].deuda» debía ser un número')],
		])
		const run = await runImport(deps({ debts: baseDebts(), failures }), MANUAL)
		assert.equal(run.status, RUN_STATUS.Completed)
		const byContract = new Map(run.items.map(item => [item.contractId, item]))
		assert.equal(byContract.get(900102)?.outcome, RUN_ITEM_OUTCOME.ProviderError)
		assert.match(byContract.get(900102)?.detail ?? '', /HTTP 500/)
		assert.equal(byContract.get(900103)?.outcome, CONTRACT_REJECTION.InconsistentResponse)
		assert.equal(run.counters[RUN_ITEM_OUTCOME.Imported], 2)
	})

	it('credenciales malas: la corrida queda fallida con el error y no importa nada', async () => {
		const listFailure = new ProviderError(PROVIDER_ERROR_KIND.Auth, 'El administrador rechazó el inicio de sesión: Contraseña Incorrecta.')
		const run = await runImport(deps({ debts: baseDebts(), listFailure }), MANUAL)
		assert.equal(run.status, RUN_STATUS.Failed)
		assert.match(run.error ?? '', /Contraseña Incorrecta/)
		assert.equal(context.persistence.invoices.listOpen().length, 0)
	})

	it('sin proveedor configurado falla y explica qué hacer', async () => {
		const run = await runImport(deps({ debts: baseDebts() }, { provider: { baseUrl: '', username: '', password: '' } }), MANUAL)
		assert.equal(run.status, RUN_STATUS.Failed)
		assert.match(run.error ?? '', /Configuración/)
	})
})
