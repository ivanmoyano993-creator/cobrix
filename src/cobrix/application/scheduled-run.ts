import type { Run } from '../domain/interfaces/run.interface.ts'
import { SCHEDULED_RUN_REQUEST } from './constants/run.constants.ts'
import { runImport } from './import-run.ts'
import type { ScheduledRunDeps } from './interfaces/run.interface.ts'
import { isDue } from './schedule.ts'
import { runUpdatePaid } from './update-paid-run.ts'

export async function runScheduledIfDue(deps: ScheduledRunDeps): Promise<Run[]> {
	if (deps.guard.isBusy() || !isScheduledRunDue(deps)) return []
	return deps.guard.exclusive(async () => {
		deps.schedule.markRun(deps.clock.today())
		const imported = await runImport(deps, SCHEDULED_RUN_REQUEST)
		const updated = await runUpdatePaid(deps, SCHEDULED_RUN_REQUEST)
		return [imported, updated]
	})
}

function isScheduledRunDue(deps: ScheduledRunDeps): boolean {
	return isDue({
		autoRun: deps.settings.get().autoRun,
		today: deps.clock.today(),
		localTime: deps.clock.localTime(),
		lastRunDate: deps.schedule.lastRunDate(),
	})
}
