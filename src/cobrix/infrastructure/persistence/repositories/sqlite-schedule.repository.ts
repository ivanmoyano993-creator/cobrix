import type { DatabaseSync } from 'node:sqlite'

import type { ScheduleRepository } from '../../../domain/interfaces/repositories.interface.ts'
import { SCHEDULER_STATE_ROW_ID } from '../../constants/sqlite.constants.ts'
import { text } from '../rows.ts'

export function createSqliteScheduleRepository(db: DatabaseSync): ScheduleRepository {
	return {
		lastRunDate: () => lastRunDate(db),
		markRun: date => markRun(db, date),
	}
}

function lastRunDate(db: DatabaseSync): string | null {
	const row = db.prepare('SELECT last_run_date FROM scheduler_state WHERE id = ?').get(SCHEDULER_STATE_ROW_ID)
	return row === undefined ? null : text(row, 'last_run_date')
}

function markRun(db: DatabaseSync, date: string): void {
	db.prepare('INSERT INTO scheduler_state (id, last_run_date) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET last_run_date = excluded.last_run_date')
		.run(SCHEDULER_STATE_ROW_ID, date)
}
