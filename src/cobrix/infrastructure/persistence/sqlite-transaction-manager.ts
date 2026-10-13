import type { DatabaseSync } from 'node:sqlite'

import { TRANSACTION_MODE } from '../../domain/constants/run.constants.ts'
import type { TransactionManager } from '../../domain/interfaces/repositories.interface.ts'
import type { TransactionMode } from '../../domain/types/run.types.ts'

export function createSqliteTransactionManager(db: DatabaseSync): TransactionManager {
	return {
		run<T>(mode: TransactionMode, work: () => T): T {
			return runTransaction(db, mode, work)
		},
	}
}

function runTransaction<T>(db: DatabaseSync, mode: TransactionMode, work: () => T): T {
	db.exec('BEGIN IMMEDIATE')
	try {
		const result = work()
		db.exec(mode === TRANSACTION_MODE.Commit ? 'COMMIT' : 'ROLLBACK')
		return result
	} catch (error) {
		db.exec('ROLLBACK')
		throw error
	}
}
