import type { RunCounters, RunItemOutcome, RunKind, RunStatus, RunTrigger } from '../types/run.types.ts'

export interface NewRun {
	readonly kind: RunKind
	readonly dryRun: boolean
	readonly trigger: RunTrigger
	readonly startedAt: string
}

export interface RunItem {
	readonly contractId: number | null
	readonly externalId: string | null
	readonly customerName: string | null
	readonly period: string | null
	readonly amountCents: number | null
	readonly outcome: RunItemOutcome
	readonly detail: string
}

export interface RunResult {
	readonly status: RunStatus
	readonly finishedAt: string
	readonly summary: string
	readonly counters: RunCounters
	readonly error: string | null
}

export interface Run extends NewRun {
	readonly id: number
	readonly status: RunStatus
	readonly finishedAt: string | null
	readonly summary: string | null
	readonly counters: RunCounters
	readonly error: string | null
	readonly items: readonly RunItem[]
}
