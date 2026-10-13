import type { DatabaseSync } from 'node:sqlite'

import { RUN_ITEM_OUTCOMES, RUN_KINDS, RUN_STATUS, RUN_STATUSES, RUN_TRIGGERS } from '../../../domain/constants/run.constants.ts'
import type { RunRepository } from '../../../domain/interfaces/repositories.interface.ts'
import type { NewRun, Run, RunItem, RunResult } from '../../../domain/interfaces/run.interface.ts'
import type { RunCounters } from '../../../domain/types/run.types.ts'
import { SQL_FALSE, SQL_TRUE } from '../../constants/sqlite.constants.ts'
import { flag, integer, nullableInteger, nullableText, oneOf, text } from '../rows.ts'

export function createSqliteRunRepository(db: DatabaseSync): RunRepository {
	return {
		start: run => startRun(db, run),
		addItems: (runId, items) => addRunItems(db, runId, items),
		finish: (runId, result) => finishRun(db, runId, result),
		get: runId => getRun(db, runId),
	}
}

function startRun(db: DatabaseSync, run: NewRun): number {
	const result = db.prepare('INSERT INTO runs (kind, dry_run, trigger, status, started_at) VALUES (?, ?, ?, ?, ?)')
		.run(run.kind, run.dryRun ? SQL_TRUE : SQL_FALSE, run.trigger, RUN_STATUS.Running, run.startedAt)
	return Number(result.lastInsertRowid)
}

function addRunItems(db: DatabaseSync, runId: number, items: readonly RunItem[]): void {
	const insert = db.prepare(`
		INSERT INTO run_items (run_id, contract_id, external_id, customer_name, period, amount_cents, outcome, detail)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`)
	for (const item of items) {
		insert.run(runId, item.contractId, item.externalId, item.customerName, item.period, item.amountCents, item.outcome, item.detail)
	}
}

function finishRun(db: DatabaseSync, runId: number, result: RunResult): void {
	db.prepare('UPDATE runs SET status = ?, finished_at = ?, summary = ?, error = ? WHERE id = ?')
		.run(result.status, result.finishedAt, result.summary, result.error, runId)
	const insert = db.prepare('INSERT INTO run_counters (run_id, name, value) VALUES (?, ?, ?)')
	for (const [name, value] of Object.entries(result.counters)) insert.run(runId, name, value)
}

function getRun(db: DatabaseSync, runId: number): Run | null {
	const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId)
	if (row === undefined) return null
	return {
		id: integer(row, 'id'),
		kind: oneOf(row, 'kind', RUN_KINDS),
		dryRun: flag(row, 'dry_run'),
		trigger: oneOf(row, 'trigger', RUN_TRIGGERS),
		status: oneOf(row, 'status', RUN_STATUSES),
		startedAt: text(row, 'started_at'),
		finishedAt: nullableText(row, 'finished_at'),
		summary: nullableText(row, 'summary'),
		error: nullableText(row, 'error'),
		counters: readCounters(db, runId),
		items: readRunItems(db, runId),
	}
}

function readCounters(db: DatabaseSync, runId: number): RunCounters {
	const rows = db.prepare('SELECT name, value FROM run_counters WHERE run_id = ? ORDER BY rowid').all(runId)
	return Object.fromEntries(rows.map(row => [text(row, 'name'), integer(row, 'value')]))
}

function readRunItems(db: DatabaseSync, runId: number): RunItem[] {
	return db.prepare('SELECT * FROM run_items WHERE run_id = ? ORDER BY id').all(runId).map(row => ({
		contractId: nullableInteger(row, 'contract_id'),
		externalId: nullableText(row, 'external_id'),
		customerName: nullableText(row, 'customer_name'),
		period: nullableText(row, 'period'),
		amountCents: nullableInteger(row, 'amount_cents'),
		outcome: oneOf(row, 'outcome', RUN_ITEM_OUTCOMES),
		detail: text(row, 'detail'),
	}))
}
