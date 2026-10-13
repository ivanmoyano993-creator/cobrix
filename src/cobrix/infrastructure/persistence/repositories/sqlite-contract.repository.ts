import type { DatabaseSync } from 'node:sqlite'

import type { ContractInfo } from '../../../domain/interfaces/import.interface.ts'
import type { ContractRepository } from '../../../domain/interfaces/repositories.interface.ts'

export function createSqliteContractRepository(db: DatabaseSync): ContractRepository {
	return {
		upsert: (contract, customerId, at) => upsertContract(db, contract, customerId, at),
	}
}

function upsertContract(db: DatabaseSync, contract: ContractInfo, customerId: string, at: string): void {
	db.prepare(`
		INSERT INTO contracts (id, customer_id, code, status, plan, price_cents, branch, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO UPDATE SET
			customer_id = excluded.customer_id,
			code = excluded.code,
			status = excluded.status,
			plan = excluded.plan,
			price_cents = excluded.price_cents,
			branch = excluded.branch,
			updated_at = excluded.updated_at
	`).run(contract.id, customerId, contract.code, contract.status, contract.plan, contract.priceCents, contract.branch, at)
}
