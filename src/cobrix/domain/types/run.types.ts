import type { INSTALLMENT_OUTCOME } from '../constants/import.constants.ts'
import type { RUN_ITEM_OUTCOME, RUN_KIND, RUN_STATUS, RUN_TRIGGER, TRANSACTION_MODE } from '../constants/run.constants.ts'
import type { InstallmentOutcome } from './import.types.ts'
import type { PaymentOutcome } from './payment.types.ts'
import type { ValueOf } from './utility.types.ts'

export type RunKind = ValueOf<typeof RUN_KIND>

export type RunStatus = ValueOf<typeof RUN_STATUS>

export type RunTrigger = ValueOf<typeof RUN_TRIGGER>

export type TransactionMode = ValueOf<typeof TRANSACTION_MODE>

export type RunItemOutcome =
	| Exclude<InstallmentOutcome, typeof INSTALLMENT_OUTCOME.Importable>
	| ValueOf<typeof RUN_ITEM_OUTCOME>
	| PaymentOutcome

export type RunCounters = Readonly<Record<string, number>>
