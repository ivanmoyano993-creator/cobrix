import { HISTORY_EVENT } from '../domain/constants/history.constants.ts'
import { CONTRACT_KIND, CONTRACT_REJECTION, INSTALLMENT_OUTCOME } from '../domain/constants/import.constants.ts'
import { PROVIDER_ERROR_KIND } from '../domain/constants/provider.constants.ts'
import { RUN_ITEM_OUTCOME, RUN_KIND } from '../domain/constants/run.constants.ts'
import { applyRunCaps, classifyContract } from '../domain/import-rules.ts'
import type { AcceptedContract, RejectedContract } from '../domain/interfaces/import.interface.ts'
import type { Invoice } from '../domain/interfaces/invoice.interface.ts'
import type { Run, RunItem } from '../domain/interfaces/run.interface.ts'
import { ProviderError } from '../domain/provider-error.ts'
import type { RunItemOutcome } from '../domain/types/run.types.ts'
import { HELD_BY_CAP_DETAIL } from './constants/messages.constants.ts'
import { CONTRACT_STEP_LABEL } from './constants/progress.constants.ts'
import { FETCH_FAILED, REJECTED_CONTRACT_COUNTER_PREFIX, RUN_COUNTER } from './constants/run.constants.ts'
import type { ContractFetchFailure, ImportCandidate, ImportRunDeps, RunContext, RunOutcome, RunRequest } from './interfaces/run.interface.ts'
import { byContractAndPeriod, executeRun, isFatalKind, tally, transactionMode } from './run-executor.ts'
import {
	alreadyImportedDetail,
	customerCreatedDetail,
	exclusionDetail,
	importedDetail,
	importSummary,
	invoiceImportedDetail,
} from './run-messages.ts'
import type { ContractFetch } from './types/run.types.ts'

export function runImport(deps: ImportRunDeps, request: RunRequest): Promise<Run> {
	return executeRun(deps, RUN_KIND.Import, request, async context => {
		const fetched = await fetchContracts(context, deps.clock.currentPeriod())
		return deps.transactions.run(transactionMode(request), () => applyImport(deps, context, fetched))
	})
}

async function fetchContracts(context: RunContext, currentPeriod: string): Promise<ContractFetch[]> {
	const ids = await context.provider.listContractIds()
	const fetched: ContractFetch[] = []
	for (const [index, contractId] of ids.entries()) {
		fetched.push(await fetchContract(context, contractId, currentPeriod))
		context.step(index + 1, ids.length, `${CONTRACT_STEP_LABEL} ${contractId}`)
	}
	return fetched
}

async function fetchContract(context: RunContext, contractId: number, currentPeriod: string): Promise<ContractFetch> {
	try {
		const lines = await context.provider.getContractDebt(contractId)
		return classifyContract({ contractId, lines, rules: context.settings.importRules, currentPeriod })
	} catch (error) {
		if (!(error instanceof ProviderError) || isFatalKind(error.kind)) throw error
		if (error.kind === PROVIDER_ERROR_KIND.Malformed) {
			return { kind: CONTRACT_KIND.Rejected, contractId, reason: CONTRACT_REJECTION.InconsistentResponse, detail: error.message, holderName: null, installments: [] }
		}
		return { kind: FETCH_FAILED, contractId, error }
	}
}

function applyImport(deps: ImportRunDeps, context: RunContext, fetched: readonly ContractFetch[]): RunOutcome {
	const items: RunItem[] = []
	const candidates: ImportCandidate[] = []
	const contractCounters: Record<string, number> = { [RUN_COUNTER.ContractsTotal]: fetched.length }
	for (const result of fetched) {
		if (result.kind === FETCH_FAILED) {
			items.push(fetchFailureItem(result))
		} else if (result.kind === CONTRACT_KIND.NoDebt) {
			bump(contractCounters, RUN_COUNTER.ContractsNoDebt)
		} else if (result.kind === CONTRACT_KIND.Rejected) {
			bump(contractCounters, `${REJECTED_CONTRACT_COUNTER_PREFIX}${result.reason}`)
			items.push(...rejectedItems(result))
		} else {
			items.push(...collectAccepted(result, candidates))
		}
	}
	const imported = importCandidates(deps, context, candidates)
	const allItems = [...items, ...imported.items].toSorted(byContractAndPeriod)
	const counters = tally(allItems, {
		...contractCounters,
		[RUN_COUNTER.CustomersCreated]: imported.customersCreated,
		[RUN_COUNTER.ImportedAmountCents]: imported.amountCents,
	})
	return {
		items: allItems,
		counters,
		summary: importSummary({
			dryRun: context.request.dryRun,
			imported: counters[RUN_ITEM_OUTCOME.Imported] ?? 0,
			amountCents: imported.amountCents,
			customersCreated: imported.customersCreated,
			alreadyImported: counters[RUN_ITEM_OUTCOME.AlreadyImported] ?? 0,
			held: counters[RUN_ITEM_OUTCOME.HeldByCap] ?? 0,
		}),
	}
}

function collectAccepted(result: AcceptedContract, candidates: ImportCandidate[]): RunItem[] {
	const items: RunItem[] = []
	for (const installment of result.installments) {
		const candidate = { holder: result.holder, contract: result.contract, installment }
		if (installment.outcome === INSTALLMENT_OUTCOME.Importable) candidates.push(candidate)
		else items.push(candidateItem(candidate, installment.outcome, exclusionDetail(installment.outcome)))
	}
	return items
}

function importCandidates(deps: ImportRunDeps, context: RunContext, candidates: readonly ImportCandidate[]) {
	const items: RunItem[] = []
	const fresh: ImportCandidate[] = []
	for (const candidate of candidates) {
		const existing = deps.invoices.findByExternalId(candidate.installment.debtId)
		if (existing) items.push(candidateItem(candidate, RUN_ITEM_OUTCOME.AlreadyImported, alreadyImportedDetail(existing)))
		else fresh.push(candidate)
	}
	const held = applyRunCaps(fresh.map(candidate => candidate.installment), context.settings.caps)
	let customersCreated = 0
	let amountCents = 0
	fresh.forEach((candidate, index) => {
		if (held[index]) {
			items.push(candidateItem(candidate, RUN_ITEM_OUTCOME.HeldByCap, HELD_BY_CAP_DETAIL))
			return
		}
		const { invoice, customerCreated } = importCandidate(deps, context, candidate)
		if (customerCreated) customersCreated++
		amountCents += invoice.totalCents
		items.push(candidateItem(candidate, RUN_ITEM_OUTCOME.Imported, importedDetail(invoice)))
	})
	return { items, customersCreated, amountCents }
}

function importCandidate(deps: ImportRunDeps, context: RunContext, candidate: ImportCandidate): { invoice: Invoice; customerCreated: boolean } {
	const now = deps.clock.now()
	const { holder, contract, installment } = candidate
	const customerCreated = deps.customers.upsert(holder, now)
	if (customerCreated) {
		deps.history.add({ customerId: holder.documentId, kind: HISTORY_EVENT.CustomerCreated, invoiceId: null, runId: context.runId, detail: customerCreatedDetail(contract.id), occurredAt: now })
	}
	deps.contracts.upsert(contract, holder.documentId, now)
	const invoice = deps.invoices.insert({
		externalId: installment.debtId,
		customerId: holder.documentId,
		contractId: contract.id,
		period: installment.period,
		dueDate: installment.dueDate,
		cutoffDate: installment.cutoffDate,
		totalCents: installment.amountCents,
		importedRunId: context.runId,
		createdAt: now,
	})
	deps.history.add({ customerId: holder.documentId, kind: HISTORY_EVENT.InvoiceImported, invoiceId: invoice.id, runId: context.runId, detail: invoiceImportedDetail(invoice), occurredAt: now })
	return { invoice, customerCreated }
}

function candidateItem(candidate: ImportCandidate, outcome: RunItemOutcome, detail: string): RunItem {
	return {
		contractId: candidate.contract.id,
		externalId: candidate.installment.debtId,
		customerName: candidate.holder.name,
		period: candidate.installment.period,
		amountCents: candidate.installment.amountCents,
		outcome,
		detail,
	}
}

function rejectedItems(result: RejectedContract): RunItem[] {
	if (result.installments.length === 0) {
		return [{ contractId: result.contractId, externalId: null, customerName: result.holderName, period: null, amountCents: null, outcome: result.reason, detail: result.detail }]
	}
	return result.installments.map(installment => ({
		contractId: result.contractId,
		externalId: installment.debtId,
		customerName: result.holderName,
		period: installment.period,
		amountCents: installment.amountCents,
		outcome: installment.outcome,
		detail: result.detail,
	}))
}

function fetchFailureItem(failure: ContractFetchFailure): RunItem {
	return {
		contractId: failure.contractId,
		externalId: null,
		customerName: null,
		period: null,
		amountCents: null,
		outcome: RUN_ITEM_OUTCOME.ProviderError,
		detail: failure.error.message,
	}
}

function bump(counters: Record<string, number>, name: string): void {
	counters[name] = (counters[name] ?? 0) + 1
}
