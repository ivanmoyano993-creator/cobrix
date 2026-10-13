import { lastDayOfPeriod } from '../../shared/dates.ts'
import { HISTORY_EVENT } from '../domain/constants/history.constants.ts'
import { NO_DEBT_ID } from '../domain/constants/import.constants.ts'
import { PAYMENT_OUTCOME } from '../domain/constants/payment.constants.ts'
import { RUN_ITEM_OUTCOME, RUN_KIND } from '../domain/constants/run.constants.ts'
import type { DebtLine } from '../domain/interfaces/import.interface.ts'
import type { Invoice } from '../domain/interfaces/invoice.interface.ts'
import type { LedgerEntry } from '../domain/interfaces/payment.interface.ts'
import type { DateRange } from '../domain/interfaces/provider.interface.ts'
import type { Run, RunItem } from '../domain/interfaces/run.interface.ts'
import { toCents } from '../domain/money.ts'
import { classifyPayment } from '../domain/payment-rules.ts'
import { ProviderError } from '../domain/provider-error.ts'
import type { RunItemOutcome } from '../domain/types/run.types.ts'
import { CHECKED, FETCH_FAILED, RUN_COUNTER } from './constants/run.constants.ts'
import type { RunContext, RunOutcome, RunRequest, UpdatePaidRunDeps } from './interfaces/run.interface.ts'
import { executeRun, isFatalKind, tally, transactionMode } from './run-executor.ts'
import { invoicePaidDetail, paidSummary, paymentDetail } from './run-messages.ts'
import type { PaymentCheck } from './types/run.types.ts'

export function runUpdatePaid(deps: UpdatePaidRunDeps, request: RunRequest): Promise<Run> {
	return executeRun(deps, RUN_KIND.UpdatePaid, request, async context => {
		const open = deps.invoices.listOpen()
		const checks = await checkInvoices(context, open, deps.clock.currentPeriod())
		return deps.transactions.run(transactionMode(request), () => applyPayments(deps, context, checks))
	})
}

async function checkInvoices(context: RunContext, open: readonly Invoice[], currentPeriod: string): Promise<PaymentCheck[]> {
	const checks: PaymentCheck[] = []
	for (const [contractId, invoices] of groupByContract(open)) {
		checks.push(...await checkContract(context, contractId, invoices, currentPeriod))
	}
	return checks
}

async function checkContract(context: RunContext, contractId: number, invoices: readonly Invoice[], currentPeriod: string): Promise<PaymentCheck[]> {
	try {
		const ledger = await context.provider.getLedger(contractId, ledgerRange(invoices, currentPeriod))
		const pending = isMissingFromLedger(invoices, ledger) ? pendingDebts(await context.provider.getContractDebt(contractId)) : new Map<string, number>()
		return invoices.map(invoice => ({
			kind: CHECKED,
			invoice,
			verdict: classifyPayment({
				debtId: invoice.externalId,
				contractId,
				openBalanceCents: invoice.balanceCents,
				ledger,
				pendingDebtCents: pending.get(invoice.externalId) ?? null,
			}),
		}))
	} catch (error) {
		if (!(error instanceof ProviderError) || isFatalKind(error.kind)) throw error
		return invoices.map(invoice => ({ kind: FETCH_FAILED, invoice, error }))
	}
}

function applyPayments(deps: UpdatePaidRunDeps, context: RunContext, checks: readonly PaymentCheck[]): RunOutcome {
	const now = deps.clock.now()
	const items: RunItem[] = []
	let paidAmountCents = 0
	for (const check of checks) {
		if (check.kind === FETCH_FAILED) {
			items.push(invoiceItem(check.invoice, RUN_ITEM_OUTCOME.ProviderError, check.error.message))
			continue
		}
		const { invoice, verdict } = check
		if (verdict.outcome === PAYMENT_OUTCOME.Paid) {
			deps.invoices.markPaid(invoice.id, verdict.paidBy)
			deps.history.add({ customerId: invoice.customerId, kind: HISTORY_EVENT.InvoicePaid, invoiceId: invoice.id, runId: context.runId, detail: invoicePaidDetail(invoice, verdict), occurredAt: now })
			paidAmountCents += invoice.balanceCents
		}
		items.push(invoiceItem(invoice, verdict.outcome, paymentDetail(verdict)))
	}
	const counters = tally(items, { [RUN_COUNTER.InvoicesChecked]: checks.length, [RUN_COUNTER.PaidAmountCents]: paidAmountCents })
	const paid = counters[PAYMENT_OUTCOME.Paid] ?? 0
	return {
		items,
		counters,
		summary: paidSummary({ dryRun: context.request.dryRun, paid, partial: counters[PAYMENT_OUTCOME.PartialPayment] ?? 0, stillOpen: checks.length - paid }),
	}
}

function groupByContract(invoices: readonly Invoice[]): Map<number, Invoice[]> {
	const groups = new Map<number, Invoice[]>()
	for (const invoice of invoices) groups.set(invoice.contractId, [...(groups.get(invoice.contractId) ?? []), invoice])
	return groups
}

function ledgerRange(invoices: readonly Invoice[], currentPeriod: string): DateRange {
	const from = invoices.map(invoice => invoice.dueDate).reduce((earliest, date) => (date < earliest ? date : earliest))
	return { from, to: lastDayOfPeriod(currentPeriod) }
}

function isMissingFromLedger(invoices: readonly Invoice[], ledger: readonly LedgerEntry[]): boolean {
	const listed = new Set(ledger.map(entry => String(entry.payment.installmentId)))
	return invoices.some(invoice => !listed.has(invoice.externalId))
}

function pendingDebts(lines: readonly DebtLine[]): Map<string, number> {
	const pending = new Map<string, number>()
	for (const line of lines) {
		const cents = toCents(line.debt)
		if (line.debtId !== NO_DEBT_ID && cents !== null) pending.set(line.debtId, cents)
	}
	return pending
}

function invoiceItem(invoice: Invoice, outcome: RunItemOutcome, detail: string): RunItem {
	return {
		contractId: invoice.contractId,
		externalId: invoice.externalId,
		customerName: invoice.customerName,
		period: invoice.period,
		amountCents: invoice.balanceCents,
		outcome,
		detail,
	}
}
