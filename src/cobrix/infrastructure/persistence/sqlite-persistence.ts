import { DatabaseSync } from 'node:sqlite'

import type { Persistence } from '../../domain/interfaces/repositories.interface.ts'
import { SCHEMA_SQL } from '../constants/sqlite.constants.ts'
import type { SqlitePersistenceOptions } from '../interfaces/persistence.interface.ts'
import { createSqliteContractRepository } from './repositories/sqlite-contract.repository.ts'
import { createSqliteCustomerRepository } from './repositories/sqlite-customer.repository.ts'
import { createSqliteHistoryRepository } from './repositories/sqlite-history.repository.ts'
import { createSqliteInvoiceRepository } from './repositories/sqlite-invoice.repository.ts'
import { createSqliteRunRepository } from './repositories/sqlite-run.repository.ts'
import { createSqliteScheduleRepository } from './repositories/sqlite-schedule.repository.ts'
import { createSqliteSettingsRepository } from './repositories/sqlite-settings.repository.ts'
import { createSecretBox } from './secret-box.ts'
import { createSqliteTransactionManager } from './sqlite-transaction-manager.ts'

export function createSqlitePersistence(options: SqlitePersistenceOptions): Persistence {
	const secrets = createSecretBox(options.secretKey)
	const db = new DatabaseSync(options.path)
	db.exec(SCHEMA_SQL)
	return {
		settings: createSqliteSettingsRepository(db, secrets),
		customers: createSqliteCustomerRepository(db),
		contracts: createSqliteContractRepository(db),
		invoices: createSqliteInvoiceRepository(db),
		runs: createSqliteRunRepository(db),
		history: createSqliteHistoryRepository(db),
		schedule: createSqliteScheduleRepository(db),
		transactions: createSqliteTransactionManager(db),
		close: () => db.close(),
	}
}
