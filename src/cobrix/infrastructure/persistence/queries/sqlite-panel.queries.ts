import type { DatabaseSync } from 'node:sqlite'

import { DOCUMENT_TYPES, PERSON_KINDS } from '../../../domain/constants/document.constants.ts'
import { CONTRACT_STATUSES } from '../../../domain/constants/import.constants.ts'
import { normalizeDocument } from '../../../domain/document.ts'
import type { ContractInfo } from '../../../domain/interfaces/import.interface.ts'
import type { CustomerFile, CustomerProfile, CustomerRow, Overview, PageRequest, Paged, PanelQueries } from '../../../domain/interfaces/queries.interface.ts'
import type { RunSummary } from '../../../domain/interfaces/run.interface.ts'
import {
	CUSTOMER_ROWS_ORDER,
	CUSTOMER_ROWS_SELECT,
	CUSTOMER_SEARCH_WHERE,
	DOCUMENT_FRAGMENT,
	DOCUMENT_SEPARATORS,
	INVOICE_SELECT,
	LIKE_ESCAPE,
	LIKE_SPECIAL_CHARACTERS,
	OVERVIEW_SELECT,
} from '../../constants/sqlite.constants.ts'
import type { SqlRow } from '../../types/sqlite.types.ts'
import { listHistory } from '../repositories/sqlite-history.repository.ts'
import { toInvoice } from '../repositories/sqlite-invoice.repository.ts'
import { toRunSummary } from '../repositories/sqlite-run.repository.ts'
import { integer, nullableInteger, nullableOneOf, nullableText, oneOf, text } from '../rows.ts'

export function createSqlitePanelQueries(db: DatabaseSync): PanelQueries {
	return {
		overview: () => overview(db),
		listCustomers: (search, request) => listCustomers(db, search, request),
		getCustomerFile: customerId => getCustomerFile(db, customerId),
		listRuns: request => listRuns(db, request),
	}
}

function overview(db: DatabaseSync): Overview {
	const row = db.prepare(OVERVIEW_SELECT).get()
	if (row === undefined) throw new Error('No se pudieron leer los totales de Cobrix.')
	return {
		customers: integer(row, 'customers'),
		contracts: integer(row, 'contracts'),
		openInvoices: integer(row, 'open_invoices'),
		paidInvoices: integer(row, 'paid_invoices'),
		receivableCents: integer(row, 'receivable_cents'),
		providerContracts: nullableInteger(row, 'provider_contracts'),
	}
}

function listCustomers(db: DatabaseSync, search: string, request: PageRequest): Paged<CustomerRow> {
	const term = search.trim()
	const where = term === '' ? '' : CUSTOMER_SEARCH_WHERE
	const documentId = term === '' ? null : documentTerm(term)
	const params = term === '' ? [] : [documentId, containing(documentId ?? ''), containing(term.toUpperCase())]
	const count = db.prepare(`SELECT COUNT(*) AS total FROM customers ${where}`).get(...params)
	const rows = db.prepare(`${CUSTOMER_ROWS_SELECT} ${where} ${CUSTOMER_ROWS_ORDER} LIMIT ? OFFSET ?`).all(...params, request.size, offset(request))
	return { items: rows.map(toCustomerRow), total: count === undefined ? 0 : integer(count, 'total') }
}

function documentTerm(term: string): string | null {
	const normalized = normalizeDocument(term)?.id
	if (normalized !== undefined) return normalized
	const compact = term.toUpperCase().replaceAll(DOCUMENT_SEPARATORS, '')
	return DOCUMENT_FRAGMENT.test(compact) ? compact : null
}

function offset(request: PageRequest): number {
	return (request.page - 1) * request.size
}

function getCustomerFile(db: DatabaseSync, customerId: string): CustomerFile | null {
	const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId)
	if (row === undefined) return null
	return {
		customer: toCustomerProfile(row),
		contracts: db.prepare('SELECT * FROM contracts WHERE customer_id = ? ORDER BY id').all(customerId).map(toContract),
		invoices: db.prepare(`${INVOICE_SELECT} WHERE invoices.customer_id = ? ORDER BY invoices.period DESC, invoices.contract_id`).all(customerId).map(toInvoice),
		history: listHistory(db, customerId),
	}
}

function listRuns(db: DatabaseSync, request: PageRequest): Paged<RunSummary> {
	const count = db.prepare('SELECT COUNT(*) AS total FROM runs').get()
	const rows = db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT ? OFFSET ?').all(request.size, offset(request))
	return { items: rows.map(toRunSummary), total: count === undefined ? 0 : integer(count, 'total') }
}

function containing(term: string): string {
	return `%${term.replaceAll(LIKE_SPECIAL_CHARACTERS, character => `${LIKE_ESCAPE}${character}`)}%`
}

function toCustomerRow(row: SqlRow): CustomerRow {
	return {
		id: text(row, 'id'),
		name: text(row, 'name'),
		documentType: nullableOneOf(row, 'document_type', DOCUMENT_TYPES),
		personKind: oneOf(row, 'person_kind', PERSON_KINDS),
		contracts: integer(row, 'contracts'),
		openInvoices: integer(row, 'open_invoices'),
		paidInvoices: integer(row, 'paid_invoices'),
		debtCents: integer(row, 'debt_cents'),
		oldestDueDate: nullableText(row, 'oldest_due_date'),
	}
}

function toCustomerProfile(row: SqlRow): CustomerProfile {
	return {
		id: text(row, 'id'),
		name: text(row, 'name'),
		documentType: nullableOneOf(row, 'document_type', DOCUMENT_TYPES),
		personKind: oneOf(row, 'person_kind', PERSON_KINDS),
		email: text(row, 'email'),
		phone: text(row, 'phone'),
		origin: text(row, 'origin'),
		createdAt: text(row, 'created_at'),
	}
}

function toContract(row: SqlRow): ContractInfo {
	return {
		id: integer(row, 'id'),
		code: text(row, 'code'),
		status: oneOf(row, 'status', CONTRACT_STATUSES),
		plan: text(row, 'plan'),
		priceCents: integer(row, 'price_cents'),
		branch: text(row, 'branch'),
	}
}
