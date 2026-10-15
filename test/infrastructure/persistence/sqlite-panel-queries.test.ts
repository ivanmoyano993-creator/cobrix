import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { HISTORY_EVENT } from '../../../src/cobrix/domain/constants/history.constants.ts'
import { CONTRACT_STATUS } from '../../../src/cobrix/domain/constants/import.constants.ts'
import { RUN_KIND, RUN_STATUS, RUN_TRIGGER } from '../../../src/cobrix/domain/constants/run.constants.ts'
import type { ContractInfo, Holder } from '../../../src/cobrix/domain/interfaces/import.interface.ts'
import { createTestPersistence, type TestPersistence } from '../../support/test-persistence.ts'

const AT = '2026-10-13T14:00:00.000Z'

const ALL = { page: 1, size: 50 }

const ANA: Holder = { documentId: 'V12345678', documentType: 'V', personKind: 'natural', name: 'ANA PEREZ', email: 'ANA@EXAMPLE.COM', phone: '0412' }
const FARO: Holder = { documentId: 'J401234567', documentType: 'J', personKind: 'legal', name: 'COMERCIAL EL FARO, C.A.', email: 'FARO@EXAMPLE.COM', phone: '0212' }
const ELENA: Holder = { documentId: '9000123', documentType: null, personKind: 'natural', name: 'ELENA RUIZ', email: 'ELENA@EXAMPLE.COM', phone: '0414' }

function contract(id: number, status: ContractInfo['status'] = CONTRACT_STATUS.Active): ContractInfo {
	return { id, code: `0${id}`, status, plan: 'PLAN15MB25', priceCents: 2500, branch: 'CARACAS' }
}

describe('createSqlitePanelQueries', () => {
	let context: TestPersistence

	function seed(holder: Holder, contractInfo: ContractInfo, invoices: Array<[string, string, number]>): number[] {
		const { persistence } = context
		persistence.customers.upsert(holder, AT)
		persistence.contracts.upsert(contractInfo, holder.documentId, AT)
		return invoices.map(([externalId, period, totalCents]) => persistence.invoices.insert({
			externalId,
			customerId: holder.documentId,
			contractId: contractInfo.id,
			period,
			dueDate: `${period}-01`,
			cutoffDate: `${period}-01`,
			totalCents,
			importedRunId: 1,
			createdAt: AT,
		}).id)
	}

	beforeEach(() => {
		context = createTestPersistence()
		const [anaFirst] = seed(ANA, contract(900101), [['7000008', '2026-08', 2000], ['7000009', '2026-09', 2500]])
		seed(ANA, contract(900199, CONTRACT_STATUS.Cut), [['7000090', '2026-07', 2500]])
		seed(FARO, contract(900104), [['7000040', '2026-10', 6000]])
		seed(ELENA, contract(900113), [])
		if (anaFirst !== undefined) context.persistence.invoices.markPaid(anaFirst, { invoiceId: 8800120, invoiceNumber: '008800120', date: '2026-10-13' })
	})

	afterEach(() => {
		context.dispose()
	})

	it('resume los totales de la integración', () => {
		assert.deepEqual(context.persistence.queries.overview(), { customers: 3, contracts: 4, openInvoices: 3, paidInvoices: 1, receivableCents: 2500 + 2500 + 6000, providerContracts: null })
	})

	it('toma los contratos del administrador de la última importación completada, aunque haya sido simulada', () => {
		const { runs, queries } = context.persistence
		const older = runs.start({ kind: RUN_KIND.Import, dryRun: false, trigger: RUN_TRIGGER.Manual, startedAt: AT })
		runs.finish(older, { status: RUN_STATUS.Completed, finishedAt: AT, summary: '', counters: { contracts_total: 25 }, error: null })
		const latest = runs.start({ kind: RUN_KIND.Import, dryRun: true, trigger: RUN_TRIGGER.Manual, startedAt: AT })
		runs.finish(latest, { status: RUN_STATUS.Completed, finishedAt: AT, summary: '', counters: { contracts_total: 27 }, error: null })
		const failed = runs.start({ kind: RUN_KIND.Import, dryRun: false, trigger: RUN_TRIGGER.Manual, startedAt: AT })
		runs.finish(failed, { status: RUN_STATUS.Failed, finishedAt: AT, summary: '', counters: {}, error: 'Contraseña Incorrecta' })
		const paid = runs.start({ kind: RUN_KIND.UpdatePaid, dryRun: false, trigger: RUN_TRIGGER.Manual, startedAt: AT })
		runs.finish(paid, { status: RUN_STATUS.Completed, finishedAt: AT, summary: '', counters: { invoices_checked: 3 }, error: null })
		assert.equal(queries.overview().providerContracts, 27)
	})

	it('lista los clientes con contratos, facturas, deuda y vencimiento más antiguo, de mayor a menor deuda', () => {
		const rows = context.persistence.queries.listCustomers('', ALL).items
		assert.deepEqual(rows.map(row => row.name), ['COMERCIAL EL FARO, C.A.', 'ANA PEREZ', 'ELENA RUIZ'])
		assert.deepEqual(rows[1], {
			id: 'V12345678',
			name: 'ANA PEREZ',
			documentType: 'V',
			personKind: 'natural',
			contracts: 2,
			openInvoices: 2,
			paidInvoices: 1,
			debtCents: 5000,
			oldestDueDate: '2026-07-01',
		})
		assert.equal(rows[2]?.oldestDueDate, null)
		assert.equal(rows[0]?.personKind, 'legal')
	})

	it('busca por nombre, cédula o RIF, con o sin separadores', () => {
		const search = (term: string) => context.persistence.queries.listCustomers(term, ALL).items.map(row => row.id)
		assert.deepEqual(search('faro'), ['J401234567'])
		assert.deepEqual(search('J-40123456-7'), ['J401234567'])
		assert.deepEqual(search('12345678'), ['V12345678'])
		assert.deepEqual(search('09000123'), ['9000123'])
		assert.deepEqual(search('nadie'), [])
		assert.deepEqual(search('45678'), ['V12345678'])
		assert.deepEqual(search('2345'), ['J401234567', 'V12345678'])
		assert.deepEqual(search('v-1234'), ['V12345678'])
		assert.deepEqual(search('4012'), ['J401234567'])
		assert.deepEqual(search('%'), [])
	})

	it('pagina los clientes y cuenta el total de lo que coincide', () => {
		const { queries } = context.persistence
		const names = (page: number, search = '') => queries.listCustomers(search, { page, size: 2 })
		assert.deepEqual(names(1).items.map(row => row.name), ['COMERCIAL EL FARO, C.A.', 'ANA PEREZ'])
		assert.deepEqual(names(2).items.map(row => row.name), ['ELENA RUIZ'])
		assert.equal(names(2).total, 3)
		assert.equal(names(1, 'ana').total, 1)
	})

	it('arma el expediente con datos, contratos, facturas e historial', () => {
		context.persistence.history.add({ customerId: ANA.documentId, kind: HISTORY_EVENT.CustomerCreated, invoiceId: null, runId: 1, detail: 'Cliente creado', occurredAt: AT })
		const file = context.persistence.queries.getCustomerFile('V12345678')
		assert.equal(file?.customer.name, 'ANA PEREZ')
		assert.equal(file?.customer.origin, 'Administrador de facturas')
		assert.deepEqual(file?.contracts.map(item => [item.id, item.status]), [[900101, CONTRACT_STATUS.Active], [900199, CONTRACT_STATUS.Cut]])
		assert.deepEqual(file?.invoices.map(item => item.externalId), ['7000009', '7000008', '7000090'])
		assert.deepEqual(file?.history.map(event => event.kind), [HISTORY_EVENT.CustomerCreated])
		assert.equal(context.persistence.queries.getCustomerFile('V99999999'), null)
	})

	it('lista las últimas corridas, la más nueva primero, sin cargar sus filas', () => {
		const { runs, queries } = context.persistence
		const first = runs.start({ kind: RUN_KIND.Import, dryRun: true, trigger: RUN_TRIGGER.Manual, startedAt: AT })
		runs.finish(first, { status: RUN_STATUS.Completed, finishedAt: AT, summary: '42 facturas se importarían', counters: {}, error: null })
		const second = runs.start({ kind: RUN_KIND.UpdatePaid, dryRun: false, trigger: RUN_TRIGGER.Scheduled, startedAt: AT })
		assert.deepEqual(queries.listRuns({ page: 1, size: 10 }).items.map(run => [run.id, run.kind, run.status]), [
			[second, RUN_KIND.UpdatePaid, RUN_STATUS.Running],
			[first, RUN_KIND.Import, RUN_STATUS.Completed],
		])
		assert.deepEqual(queries.listRuns({ page: 2, size: 1 }), { items: queries.listRuns({ page: 1, size: 10 }).items.slice(1), total: 2 })
	})
})
