import type { DatabaseSync } from 'node:sqlite'

import { CUSTOMER_ORIGIN } from '../../../domain/constants/settings.constants.ts'
import type { Holder } from '../../../domain/interfaces/import.interface.ts'
import type { CustomerRepository } from '../../../domain/interfaces/repositories.interface.ts'

export function createSqliteCustomerRepository(db: DatabaseSync): CustomerRepository {
	return {
		upsert: (holder, at) => upsertCustomer(db, holder, at),
	}
}

function upsertCustomer(db: DatabaseSync, holder: Holder, at: string): boolean {
	const exists = db.prepare('SELECT id FROM customers WHERE id = ?').get(holder.documentId) !== undefined
	if (exists) {
		db.prepare('UPDATE customers SET document_type = ?, person_kind = ?, name = ?, email = ?, phone = ?, updated_at = ? WHERE id = ?')
			.run(holder.documentType, holder.personKind, holder.name, holder.email, holder.phone, at, holder.documentId)
		return false
	}
	db.prepare('INSERT INTO customers (id, document_type, person_kind, name, email, phone, origin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
		.run(holder.documentId, holder.documentType, holder.personKind, holder.name, holder.email, holder.phone, CUSTOMER_ORIGIN, at, at)
	return true
}
