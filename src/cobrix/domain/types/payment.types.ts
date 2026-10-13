import type { PAYMENT_OUTCOME } from '../constants/payment.constants.ts'
import type { PayingInvoice } from '../interfaces/payment.interface.ts'
import type { ValueOf } from './utility.types.ts'

export type PaymentOutcome = ValueOf<typeof PAYMENT_OUTCOME>

export type PaymentVerdict =
	| { readonly outcome: typeof PAYMENT_OUTCOME.Paid; readonly paidBy: PayingInvoice }
	| { readonly outcome: typeof PAYMENT_OUTCOME.PartialPayment; readonly remainingCents: number }
	| { readonly outcome: typeof PAYMENT_OUTCOME.Unchanged }
	| { readonly outcome: typeof PAYMENT_OUTCOME.Exempt }
	| { readonly outcome: typeof PAYMENT_OUTCOME.NoEvidence }
	| { readonly outcome: typeof PAYMENT_OUTCOME.Inconsistent; readonly detail: string }
