import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import type { Clock, ScheduledRunDeps } from '../../src/cobrix/application/interfaces/run.interface.ts'
import { createRunGuard } from '../../src/cobrix/application/run-guard.ts'
import { runScheduledIfDue } from '../../src/cobrix/application/scheduled-run.ts'
import { RUN_KIND, RUN_STATUS, RUN_TRIGGER } from '../../src/cobrix/domain/constants/run.constants.ts'
import type { DebtLine } from '../../src/cobrix/domain/interfaces/import.interface.ts'
import { createFakeProvider, debtLine } from '../support/fake-provider.ts'
import { createTestPersistence, type TestPersistence } from '../support/test-persistence.ts'

function clockAt(localTime: string): Clock {
	return { now: () => '2026-10-13T14:00:00.000Z', currentPeriod: () => '2026-10', today: () => '2026-10-13', localTime: () => localTime }
}

const DEBTS = new Map<number, readonly DebtLine[]>([[900101, [debtLine(900101, '2026-10', 25, '7000010')]]])

describe('runScheduledIfDue', () => {
	let context: TestPersistence

	function deps(localTime: string, guard = createRunGuard()): ScheduledRunDeps {
		const provider = createFakeProvider({ debts: DEBTS })
		return { ...context.persistence, providerFor: () => provider, clock: clockAt(localTime), guard }
	}

	beforeEach(() => {
		context = createTestPersistence({ autoRun: { enabled: true, time: '06:00' } })
	})

	afterEach(() => {
		context.dispose()
	})

	it('antes de la hora no hace nada', async () => {
		assert.deepEqual(await runScheduledIfDue(deps('05:00')), [])
		assert.equal(context.persistence.invoices.listOpen().length, 0)
	})

	it('a la hora importa y después actualiza pagadas, marcadas como automáticas', async () => {
		const runs = await runScheduledIfDue(deps('06:01'))
		assert.deepEqual(runs.map(run => [run.kind, run.trigger, run.status]), [
			[RUN_KIND.Import, RUN_TRIGGER.Scheduled, RUN_STATUS.Completed],
			[RUN_KIND.UpdatePaid, RUN_TRIGGER.Scheduled, RUN_STATUS.Completed],
		])
		assert.equal(context.persistence.invoices.listOpen().length, 1)
	})

	it('corre una sola vez por día', async () => {
		await runScheduledIfDue(deps('06:01'))
		assert.deepEqual(await runScheduledIfDue(deps('18:00')), [])
	})

	it('si hay otra corrida en curso, no marca el día y lo reintenta en la próxima revisión', async () => {
		const guard = createRunGuard()
		let release: () => void = () => undefined
		const manual = guard.exclusive(() => new Promise<void>(resolve => { release = resolve }))
		assert.deepEqual(await runScheduledIfDue(deps('06:01', guard)), [])
		release()
		await manual
		assert.equal((await runScheduledIfDue(deps('06:02', guard))).length, 2)
	})
})
