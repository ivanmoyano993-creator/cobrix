import type { RunItemOutcome } from '../types/run.types.ts'
import { CONTRACT_REJECTION, INSTALLMENT_EXCLUSION } from './import.constants.ts'
import { PAYMENT_OUTCOME } from './payment.constants.ts'

export const RUN_KIND = {
	Import: 'import',
	UpdatePaid: 'update_paid',
} as const

export const RUN_STATUS = {
	Running: 'running',
	Completed: 'completed',
	Failed: 'failed',
} as const

export const RUN_TRIGGER = {
	Manual: 'manual',
	Scheduled: 'scheduled',
} as const

export const RUN_ITEM_OUTCOME = {
	Imported: 'imported',
	AlreadyImported: 'already_imported',
	HeldByCap: 'held_by_cap',
	ProviderError: 'provider_error',
} as const

export const TRANSACTION_MODE = {
	Commit: 'commit',
	Rollback: 'rollback',
} as const

export const RUN_KINDS = Object.values(RUN_KIND)

export const RUN_STATUSES = Object.values(RUN_STATUS)

export const RUN_TRIGGERS = Object.values(RUN_TRIGGER)

export const RUN_ITEM_OUTCOMES: readonly RunItemOutcome[] = [
	...Object.values(CONTRACT_REJECTION),
	...Object.values(INSTALLMENT_EXCLUSION),
	...Object.values(RUN_ITEM_OUTCOME),
	...Object.values(PAYMENT_OUTCOME),
]
