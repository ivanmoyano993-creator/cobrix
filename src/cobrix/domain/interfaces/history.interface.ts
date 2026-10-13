import type { HistoryEventKind } from '../types/history.types.ts'

export interface NewHistoryEvent {
	readonly customerId: string
	readonly kind: HistoryEventKind
	readonly invoiceId: number | null
	readonly runId: number | null
	readonly detail: string
	readonly occurredAt: string
}

export interface HistoryEvent extends NewHistoryEvent {
	readonly id: number
}
