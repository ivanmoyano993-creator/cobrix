import type { IsDueInput } from './interfaces/run.interface.ts'

export function isDue(input: IsDueInput): boolean {
	return input.autoRun.enabled && input.localTime >= input.autoRun.time && input.lastRunDate !== input.today
}
