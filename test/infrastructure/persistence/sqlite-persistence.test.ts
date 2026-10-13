import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { HISTORY_EVENT } from '../../../src/cobrix/domain/constants/history.constants.ts'
import { CONTRACT_STATUS, INSTALLMENT_OUTCOME } from '../../../src/cobrix/domain/constants/import.constants.ts'
import { INVOICE_STATUS } from '../../../src/cobrix/domain/constants/invoice.constants.ts'
import { RUN_ITEM_OUTCOME, RUN_KIND, RUN_STATUS, RUN_TRIGGER, TRANSACTION_MODE } from '../../../src/cobrix/domain/constants/run.constants.ts'
import { DEFAULT_SETTINGS } from '../../../src/cobrix/domain/constants/settings.constants.ts'
import type { ContractInfo, Holder } from '../../../src/cobrix/domain/interfaces/import.interface.ts'
import type { NewInvoice } from '../../../src/cobrix/domain/interfaces/invoice.interface.ts'
import type { Persistence } from '../../../src/cobrix/domain/interfaces/repositories.interface.ts'
import type { Settings } from '../../../src/cobrix/domain/interfaces/settings.interface.ts'
import { createSqlitePersistence } from '../../../src/cobrix/infrastructure/persistence/sqlite-persistence.ts'

const AT = '2026-10-13T14:00:00.000Z'

const HOLDER: Holder = { documentId: 'V12345678', documentType: 'V', personKind: 'natural', name: 'ANA PEREZ', email: 'ANA@EXAMPLE.COM', phone: '0412' }
const CONTRACT: ContractInfo = { id: 900101, code: '0900101', status: CONTRACT_STATUS.Active, plan: 'PLAN15MB25', priceCents: 2500, branch: 'VALENCIA' }

const SETTINGS: Settings = {
	company: { name: 'Cobrix', rif: 'J-12345678-9', collectionEmail: 'cobranza@cobrix.test' },
	provider: { baseUrl: 'http://127.0.0.1:4310/api/v1', username: 'cobrix', password: 'cobrix-sandbox' },
	importRules: { importableStatuses: [CONTRACT_STATUS.Active], windowMonths: 6, maxRecentPerContract: 12, graceDays: 5, excludedDocumentTypes: ['J', 'G'] },
	caps: { maxNewInvoices: 100, maxNewAmountCents: 500000 },
	autoRun: { enabled: true, time: '07:30' },
}

function newInvoice(externalId: string, overrides: Partial<NewInvoice> = {}): NewInvoice {
	return {
		externalId,
		customerId: HOLDER.documentId,
		contractId: CONTRACT.id,
		period: '2026-08',
		dueDate: '2026-08-01',
		cutoffDate: '2026-08-06',
		totalCents: 2000,
		importedRunId: 1,
		createdAt: AT,
		...overrides,
	}
}

describe('createSqlitePersistence', () => {
	let dir: string
	let path: string
	let secretKey: Buffer
	let persistence: Persistence

	function seedCustomer(): void {
		persistence.customers.upsert(HOLDER, AT)
		persistence.contracts.upsert(CONTRACT, HOLDER.documentId, AT)
	}

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'cobrix-persistence-'))
		path = join(dir, 'cobrix.sqlite')
		secretKey = randomBytes(32)
		persistence = createSqlitePersistence({ path, secretKey })
	})

	afterEach(() => {
		persistence.close()
		rmSync(dir, { recursive: true, force: true })
	})

	describe('configuración', () => {
		it('sin guardar nada devuelve la configuración por defecto', () => {
			assert.deepEqual(persistence.settings.get(), DEFAULT_SETTINGS)
		})

		it('guarda y persiste la configuración completa al reabrir la base', () => {
			persistence.settings.save(SETTINGS)
			persistence.close()
			persistence = createSqlitePersistence({ path, secretKey })
			assert.deepEqual(persistence.settings.get(), SETTINGS)
		})

		it('la contraseña del proveedor queda cifrada en la base, nunca en texto plano', () => {
			persistence.settings.save(SETTINGS)
			const raw = new DatabaseSync(path)
			const row = raw.prepare('SELECT provider_password FROM settings').get()
			raw.close()
			assert.ok(row)
			assert.notEqual(row.provider_password, SETTINGS.provider.password)
			assert.doesNotMatch(String(row.provider_password), /cobrix-sandbox/)
			assert.match(String(row.provider_password), /^v1:/)
		})

		it('con otra clave no se puede leer la contraseña', () => {
			persistence.settings.save(SETTINGS)
			persistence.close()
			persistence = createSqlitePersistence({ path, secretKey: randomBytes(32) })
			assert.throws(() => persistence.settings.get(), /contraseña del proveedor/)
		})
	})

	describe('clientes', () => {
		it('crea el cliente una sola vez y actualiza sus datos después', () => {
			assert.equal(persistence.customers.upsert(HOLDER, AT), true)
			assert.equal(persistence.customers.upsert({ ...HOLDER, email: 'NUEVO@EXAMPLE.COM' }, AT), false)
		})
	})

	describe('facturas', () => {
		it('numera las facturas de Cobrix y las deja abiertas con saldo igual al total', () => {
			seedCustomer()
			const first = persistence.invoices.insert(newInvoice('7000008'))
			const second = persistence.invoices.insert(newInvoice('7000009', { period: '2026-09', totalCents: 2500 }))
			assert.equal(first.number, 'COB-000001')
			assert.equal(second.number, 'COB-000002')
			assert.equal(first.status, INVOICE_STATUS.Open)
			assert.equal(first.balanceCents, 2000)
			assert.deepEqual(persistence.invoices.findByExternalId('7000008'), first)
			assert.equal(persistence.invoices.findByExternalId('9999999'), null)
		})

		it('nunca duplica una cuota: el ID externo es único', () => {
			seedCustomer()
			persistence.invoices.insert(newInvoice('7000008'))
			assert.throws(() => persistence.invoices.insert(newInvoice('7000008')))
		})

		it('marca pagada con la factura del administrador y la saca de las abiertas', () => {
			seedCustomer()
			const invoice = persistence.invoices.insert(newInvoice('7000008'))
			persistence.invoices.insert(newInvoice('7000009', { period: '2026-09' }))
			persistence.invoices.markPaid(invoice.id, { invoiceId: 8800120, invoiceNumber: '008800120', date: '2026-10-13' })
			const paid = persistence.invoices.findByExternalId('7000008')
			assert.equal(paid?.status, INVOICE_STATUS.Paid)
			assert.equal(paid?.balanceCents, 0)
			assert.equal(paid?.paidAt, '2026-10-13')
			assert.equal(paid?.paidByInvoiceNumber, '008800120')
			assert.deepEqual(persistence.invoices.listOpen().map(item => item.externalId), ['7000009'])
		})
	})

	describe('transacciones', () => {
		it('commit guarda todo lo hecho dentro', () => {
			persistence.transactions.run(TRANSACTION_MODE.Commit, () => {
				seedCustomer()
				persistence.invoices.insert(newInvoice('7000008'))
			})
			assert.equal(persistence.invoices.listOpen().length, 1)
		})

		it('rollback devuelve el resultado pero no deja nada escrito: así se simula', () => {
			const number = persistence.transactions.run(TRANSACTION_MODE.Rollback, () => {
				seedCustomer()
				return persistence.invoices.insert(newInvoice('7000008')).number
			})
			assert.equal(number, 'COB-000001')
			assert.equal(persistence.invoices.listOpen().length, 0)
			assert.equal(persistence.customers.upsert(HOLDER, AT), true)
		})

		it('un error dentro deshace todo y se propaga', () => {
			assert.throws(() => persistence.transactions.run(TRANSACTION_MODE.Commit, () => {
				seedCustomer()
				persistence.invoices.insert(newInvoice('7000008'))
				throw new Error('falla a mitad de camino')
			}), /falla a mitad de camino/)
			assert.equal(persistence.invoices.listOpen().length, 0)
		})
	})

	describe('historial del cliente', () => {
		it('registra los eventos en orden', () => {
			seedCustomer()
			const invoice = persistence.invoices.insert(newInvoice('7000008'))
			persistence.history.add({ customerId: HOLDER.documentId, kind: HISTORY_EVENT.CustomerCreated, invoiceId: null, runId: 1, detail: 'Cliente creado', occurredAt: AT })
			persistence.history.add({ customerId: HOLDER.documentId, kind: HISTORY_EVENT.InvoiceImported, invoiceId: invoice.id, runId: 1, detail: 'COB-000001', occurredAt: AT })
			assert.deepEqual(persistence.history.listByCustomer(HOLDER.documentId).map(event => event.kind), [HISTORY_EVENT.CustomerCreated, HISTORY_EVENT.InvoiceImported])
		})
	})

	describe('corridas', () => {
		it('registra una corrida con sus filas, contadores y resultado', () => {
			const runId = persistence.runs.start({ kind: RUN_KIND.Import, dryRun: true, trigger: RUN_TRIGGER.Manual, startedAt: AT })
			assert.equal(persistence.runs.get(runId)?.status, RUN_STATUS.Running)
			persistence.runs.addItems(runId, [
				{ contractId: 900101, externalId: '7000008', customerName: 'ANA PEREZ', period: '2026-08', amountCents: 2000, outcome: RUN_ITEM_OUTCOME.Imported, detail: '' },
				{ contractId: 900106, externalId: '7000050', customerName: 'CARLOS ROJAS', period: '2026-08', amountCents: 2000, outcome: INSTALLMENT_OUTCOME.ExcludedStatus, detail: 'El contrato está CORTESIA.' },
			])
			persistence.runs.finish(runId, { status: RUN_STATUS.Completed, finishedAt: AT, summary: '1 importada', counters: { imported: 1, excluded_status: 1 }, error: null })
			const run = persistence.runs.get(runId)
			assert.equal(run?.status, RUN_STATUS.Completed)
			assert.equal(run?.dryRun, true)
			assert.deepEqual(run?.counters, { imported: 1, excluded_status: 1 })
			assert.deepEqual(run?.items.map(item => item.outcome), [RUN_ITEM_OUTCOME.Imported, INSTALLMENT_OUTCOME.ExcludedStatus])
		})

		it('una corrida fallida guarda el error', () => {
			const runId = persistence.runs.start({ kind: RUN_KIND.UpdatePaid, dryRun: false, trigger: RUN_TRIGGER.Scheduled, startedAt: AT })
			persistence.runs.finish(runId, { status: RUN_STATUS.Failed, finishedAt: AT, summary: 'Falló', counters: {}, error: 'Contraseña Incorrecta' })
			assert.equal(persistence.runs.get(runId)?.error, 'Contraseña Incorrecta')
			assert.equal(persistence.runs.get(9999), null)
		})
	})
})
