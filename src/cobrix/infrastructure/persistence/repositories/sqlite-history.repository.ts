import type { DatabaseSync } from 'node:sqlite'

import { HISTORY_EVENTS } from '../../../domain/constants/history.constants.ts'
import type { HistoryEvent, NewHistoryEvent } from '../../../domain/interfaces/history.interface.ts'
import type { HistoryRepository } from '../../../domain/interfaces/repositories.interface.ts'
import type { SqlRow } from '../../types/sqlite.types.ts'
import { integer, nullableInteger, oneOf, text } from '../rows.ts'

export function createSqliteHistoryRepository(db: DatabaseSync): HistoryRepository {
	return {
		add: event => addHistoryEvent(db, event),
		listByCustomer: customerId => listHistory(db, customerId),
	}
}

function addHistoryEvent(db: DatabaseSync, event: NewHistoryEvent): void {
	db.prepare('INSERT INTO history (customer_id, kind, invoice_id, run_id, detail, occurred_at) VALUES (?, ?, ?, ?, ?, ?)')
		.run(event.customerId, event.kind, event.invoiceId, event.runId, event.detail, event.occurredAt)
}

export function listHistory(db: DatabaseSync, customerId: string): HistoryEvent[] {
	return db.prepare('SELECT * FROM history WHERE customer_id = ? ORDER BY id').all(customerId).map(toHistoryEvent)
}

function toHistoryEvent(row: SqlRow): HistoryEvent {
	return {
		id: integer(row, 'id'),
		customerId: text(row, 'customer_id'),
		kind: oneOf(row, 'kind', HISTORY_EVENTS),
		invoiceId: nullableInteger(row, 'invoice_id'),
		runId: nullableInteger(row, 'run_id'),
		detail: text(row, 'detail'),
		occurredAt: text(row, 'occurred_at'),
	}
}
