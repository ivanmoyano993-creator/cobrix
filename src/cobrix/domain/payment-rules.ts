import { NO_COLLECTION_INVOICE_ID, PAYMENT_OUTCOME } from './constants/payment.constants.ts'
import type { ClassifyPaymentInput, LedgerEntry, LedgerState } from './interfaces/payment.interface.ts'
import type { PaymentVerdict } from './types/payment.types.ts'
import { formatCents, toCents } from './money.ts'

export function classifyPayment(input: ClassifyPaymentInput): PaymentVerdict {
	const entries = input.ledger.filter(entry => String(entry.payment.installmentId) === input.debtId)
	if (entries.length === 0) {
		if (input.pendingDebtCents === null) return { outcome: PAYMENT_OUTCOME.NoEvidence }
		return compareBalance(input.pendingDebtCents, input.openBalanceCents)
	}

	const foreign = entries.find(entry => entry.payment.contractId !== input.contractId)
	if (foreign) return inconsistent(`La cuota aparece en el contrato ${foreign.payment.contractId}.`)

	const states = entries.map(stateOf).filter(state => state !== null)
	if (states.length !== entries.length) return inconsistent('El libro trae montos que no son números.')
	const [state] = states
	if (state === undefined || states.some(other => !sameState(other, state))) return inconsistent('Las filas de la cuota no coinciden entre sí.')
	if (state.balanceCents < 0 || state.paidCents < 0) return inconsistent('El libro trae un saldo o un pago negativo.')

	if (state.balanceCents > 0) return compareBalance(state.balanceCents, input.openBalanceCents)
	if (state.paidCents === 0) return { outcome: PAYMENT_OUTCOME.Exempt }

	const latest = latestInvoice(entries)
	if (!latest) return inconsistent('Saldo 0 con pagos, pero sin factura de cobro que lo respalde.')
	return {
		outcome: PAYMENT_OUTCOME.Paid,
		paidBy: { invoiceId: latest.invoiceId, invoiceNumber: latest.invoiceNumber, date: latest.issuedOn },
	}
}

function stateOf(entry: LedgerEntry): LedgerState | null {
	const { payment } = entry
	const feeCents = toCents(payment.fee)
	const paidCents = toCents(payment.paid)
	const discountCents = toCents(payment.discount)
	const balanceCents = toCents(payment.balance)
	if (feeCents === null || paidCents === null || discountCents === null || balanceCents === null) return null
	return { period: payment.period, feeCents, paidCents, discountCents, balanceCents }
}

function sameState(a: LedgerState, b: LedgerState): boolean {
	return a.period === b.period
		&& a.feeCents === b.feeCents
		&& a.paidCents === b.paidCents
		&& a.discountCents === b.discountCents
		&& a.balanceCents === b.balanceCents
}

function latestInvoice(entries: readonly LedgerEntry[]): LedgerEntry | null {
	return entries
		.filter(entry => entry.invoiceId !== NO_COLLECTION_INVOICE_ID)
		.reduce<LedgerEntry | null>((latest, entry) => (latest === null || isAfter(entry, latest) ? entry : latest), null)
}

function isAfter(entry: LedgerEntry, other: LedgerEntry): boolean {
	if (entry.issuedOn !== other.issuedOn) return entry.issuedOn > other.issuedOn
	return entry.invoiceId > other.invoiceId
}

function compareBalance(remainingCents: number, openBalanceCents: number): PaymentVerdict {
	if (remainingCents === openBalanceCents) return { outcome: PAYMENT_OUTCOME.Unchanged }
	if (remainingCents < openBalanceCents) return { outcome: PAYMENT_OUTCOME.PartialPayment, remainingCents }
	return inconsistent(`El saldo en el ISP (${formatCents(remainingCents)}) es mayor al de Cobrix (${formatCents(openBalanceCents)}).`)
}

function inconsistent(detail: string): PaymentVerdict {
	return { outcome: PAYMENT_OUTCOME.Inconsistent, detail }
}
