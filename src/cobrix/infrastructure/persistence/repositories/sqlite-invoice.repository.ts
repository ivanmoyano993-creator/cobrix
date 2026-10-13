import type { DatabaseSync } from 'node:sqlite'

import { INVOICE_STATUS, INVOICE_STATUSES } from '../../../domain/constants/invoice.constants.ts'
import type { Invoice, NewInvoice } from '../../../domain/interfaces/invoice.interface.ts'
import type { PayingInvoice } from '../../../domain/interfaces/payment.interface.ts'
import type { InvoiceRepository } from '../../../domain/interfaces/repositories.interface.ts'
import { invoiceNumber } from '../../../domain/invoice.ts'
import { integer, nullableInteger, nullableText, oneOf, text } from '../rows.ts'
import type { SqlRow } from '../../types/sqlite.types.ts'

export function createSqliteInvoiceRepository(db: DatabaseSync): InvoiceRepository {
	return {
		findByExternalId: externalId => findInvoice(db, 'external_id', externalId),
		insert: invoice => insertInvoice(db, invoice),
		listOpen: () => listOpenInvoices(db),
		markPaid: (invoiceId, paidBy) => markInvoicePaid(db, invoiceId, paidBy),
	}
}

function insertInvoice(db: DatabaseSync, invoice: NewInvoice): Invoice {
	const result = db.prepare(`
		INSERT INTO invoices (
			external_id, customer_id, contract_id, period, due_date, cutoff_date,
			total_cents, balance_cents, status, imported_run_id, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).run(
		invoice.externalId,
		invoice.customerId,
		invoice.contractId,
		invoice.period,
		invoice.dueDate,
		invoice.cutoffDate,
		invoice.totalCents,
		invoice.totalCents,
		INVOICE_STATUS.Open,
		invoice.importedRunId,
		invoice.createdAt,
	)
	const inserted = findInvoice(db, 'id', Number(result.lastInsertRowid))
	if (inserted === null) throw new Error(`La factura ${invoice.externalId} no quedó guardada.`)
	return inserted
}

function findInvoice(db: DatabaseSync, column: 'id' | 'external_id', value: number | string): Invoice | null {
	const row = db.prepare(`SELECT * FROM invoices WHERE ${column} = ?`).get(value)
	return row === undefined ? null : toInvoice(row)
}

function listOpenInvoices(db: DatabaseSync): Invoice[] {
	return db.prepare('SELECT * FROM invoices WHERE status = ? ORDER BY contract_id, period').all(INVOICE_STATUS.Open).map(toInvoice)
}

function markInvoicePaid(db: DatabaseSync, invoiceId: number, paidBy: PayingInvoice): void {
	db.prepare(`
		UPDATE invoices SET status = ?, balance_cents = 0, paid_at = ?, paid_by_invoice_id = ?, paid_by_invoice_number = ?
		WHERE id = ? AND status = ?
	`).run(INVOICE_STATUS.Paid, paidBy.date, paidBy.invoiceId, paidBy.invoiceNumber, invoiceId, INVOICE_STATUS.Open)
}

function toInvoice(row: SqlRow): Invoice {
	const id = integer(row, 'id')
	return {
		id,
		number: invoiceNumber(id),
		externalId: text(row, 'external_id'),
		customerId: text(row, 'customer_id'),
		contractId: integer(row, 'contract_id'),
		period: text(row, 'period'),
		dueDate: text(row, 'due_date'),
		cutoffDate: text(row, 'cutoff_date'),
		totalCents: integer(row, 'total_cents'),
		balanceCents: integer(row, 'balance_cents'),
		status: oneOf(row, 'status', INVOICE_STATUSES),
		paidAt: nullableText(row, 'paid_at'),
		paidByInvoiceId: nullableInteger(row, 'paid_by_invoice_id'),
		paidByInvoiceNumber: nullableText(row, 'paid_by_invoice_number'),
		importedRunId: integer(row, 'imported_run_id'),
		createdAt: text(row, 'created_at'),
	}
}
