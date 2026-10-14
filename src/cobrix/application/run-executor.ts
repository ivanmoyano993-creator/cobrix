import { RUN_STATUS, TRANSACTION_MODE } from '../domain/constants/run.constants.ts'
import type { ProviderConfig } from '../domain/interfaces/provider.interface.ts'
import type { Run, RunItem } from '../domain/interfaces/run.interface.ts'
import type { ProviderErrorKind } from '../domain/types/provider.types.ts'
import type { RunCounters, RunKind, TransactionMode } from '../domain/types/run.types.ts'
import { FAILED_SUMMARY } from './constants/messages.constants.ts'
import { SILENT_OBSERVER } from './constants/progress.constants.ts'
import type { StepReporter } from './types/progress.types.ts'
import { FATAL_PROVIDER_ERRORS, PROVIDER_NOT_CONFIGURED } from './constants/run.constants.ts'
import type { RunContext, RunDeps, RunOutcome, RunRequest } from './interfaces/run.interface.ts'

export async function executeRun(
	deps: RunDeps,
	kind: RunKind,
	request: RunRequest,
	work: (context: RunContext) => Promise<RunOutcome>,
): Promise<Run> {
	const observer = deps.observer ?? SILENT_OBSERVER
	const runId = deps.runs.start({ kind, dryRun: request.dryRun, trigger: request.trigger, startedAt: deps.clock.now() })
	observer.started({ runId, kind, dryRun: request.dryRun })
	const step: StepReporter = (done, total, label) => observer.stepped({ runId, done, total, label })
	try {
		const settings = deps.settings.get()
		if (!isProviderConfigured(settings.provider)) throw new Error(PROVIDER_NOT_CONFIGURED)
		const outcome = await work({ runId, settings, provider: deps.providerFor(settings.provider), request, step })
		deps.runs.addItems(runId, outcome.items)
		deps.runs.finish(runId, { status: RUN_STATUS.Completed, finishedAt: deps.clock.now(), summary: outcome.summary, counters: outcome.counters, error: null })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		deps.runs.finish(runId, { status: RUN_STATUS.Failed, finishedAt: deps.clock.now(), summary: FAILED_SUMMARY[kind], counters: {}, error: message })
	} finally {
		observer.finished(runId)
	}
	const run = deps.runs.get(runId)
	if (run === null) throw new Error(`La corrida ${runId} no quedó registrada.`)
	return run
}

export function isFatalKind(kind: ProviderErrorKind): boolean {
	return FATAL_PROVIDER_ERRORS.includes(kind)
}

export function transactionMode(request: RunRequest): TransactionMode {
	return request.dryRun ? TRANSACTION_MODE.Rollback : TRANSACTION_MODE.Commit
}

export function tally(items: readonly RunItem[], extra: RunCounters): RunCounters {
	const counters: Record<string, number> = {}
	for (const item of items) counters[item.outcome] = (counters[item.outcome] ?? 0) + 1
	for (const [name, value] of Object.entries(extra)) {
		if (value !== 0) counters[name] = (counters[name] ?? 0) + value
	}
	return counters
}

export function byContractAndPeriod(a: RunItem, b: RunItem): number {
	return (a.contractId ?? 0) - (b.contractId ?? 0) || (a.period ?? '').localeCompare(b.period ?? '')
}

function isProviderConfigured(provider: ProviderConfig): boolean {
	return provider.baseUrl.trim() !== '' && provider.username.trim() !== '' && provider.password !== ''
}
