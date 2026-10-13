import type { RunGuard } from './interfaces/run.interface.ts'
import { RunInProgressError } from './run-in-progress-error.ts'

export function createRunGuard(): RunGuard {
	let busy = false
	return {
		async exclusive<T>(work: () => Promise<T>): Promise<T> {
			if (busy) throw new RunInProgressError()
			busy = true
			try {
				return await work()
			} finally {
				busy = false
			}
		},
		isBusy: () => busy,
	}
}
