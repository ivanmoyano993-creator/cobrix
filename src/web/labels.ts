import { REJECTED_CONTRACT_COUNTER_PREFIX } from '../cobrix/application/constants/run.constants.ts'
import { CONTRACT_REJECTION } from '../cobrix/domain/constants/import.constants.ts'
import { RUN_ITEM_OUTCOMES } from '../cobrix/domain/constants/run.constants.ts'
import { isOneOf } from '../cobrix/domain/guards.ts'
import type { RunCounters, RunItemOutcome } from '../cobrix/domain/types/run.types.ts'
import {
	COUNTER_LABEL,
	COUNTER_ORDER,
	DRY_RUN_COUNTER_LABEL,
	DRY_RUN_OUTCOME_LABEL,
	MONEY_COUNTERS,
	OUTCOME_BADGE,
	OUTCOME_COUNTER_LABEL,
	REJECTED_CONTRACTS_COUNTER_LABEL,
} from './constants/labels.constants.ts'
import { usd } from './format.ts'
import type { Badge } from './interfaces/web.interface.ts'

export function isRunItemOutcome(value: string): value is RunItemOutcome {
	return isOneOf(RUN_ITEM_OUTCOMES, value)
}

export function outcomeBadge(outcome: RunItemOutcome, dryRun: boolean): Badge {
	const badge = OUTCOME_BADGE[outcome]
	return { ...badge, label: (dryRun ? DRY_RUN_OUTCOME_LABEL[outcome] : undefined) ?? badge.label }
}

export function counterLabel(name: string, dryRun: boolean): string {
	const fixed = COUNTER_LABEL[name]
	if (fixed !== undefined) return fixed
	if (isRunItemOutcome(name)) return (dryRun ? DRY_RUN_COUNTER_LABEL[name] : undefined) ?? OUTCOME_COUNTER_LABEL[name]
	const reason = name.startsWith(REJECTED_CONTRACT_COUNTER_PREFIX) ? name.slice(REJECTED_CONTRACT_COUNTER_PREFIX.length) : ''
	if (isOneOf(Object.values(CONTRACT_REJECTION), reason)) return REJECTED_CONTRACTS_COUNTER_LABEL[reason]
	return name
}

export function counterValue(name: string, value: number): string {
	return MONEY_COUNTERS.has(name) ? usd(value) : String(value)
}

export function orderedCounters(counters: RunCounters): Array<[string, number]> {
	const rank = (name: string): number => {
		const index = COUNTER_ORDER.indexOf(name)
		return index === -1 ? COUNTER_ORDER.length : index
	}
	return Object.entries(counters).toSorted(([a], [b]) => rank(a) - rank(b))
}
