import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createRunGuard } from '../../src/cobrix/application/run-guard.ts'
import { isDue } from '../../src/cobrix/application/schedule.ts'
import { RunInProgressError } from '../../src/cobrix/application/run-in-progress-error.ts'

const AUTO_RUN = { enabled: true, time: '06:00' }

describe('isDue', () => {
	it('corre una vez por día cuando ya pasó la hora elegida', () => {
		assert.equal(isDue({ autoRun: AUTO_RUN, today: '2026-10-13', localTime: '06:00', lastRunDate: '2026-10-12' }), true)
		assert.equal(isDue({ autoRun: AUTO_RUN, today: '2026-10-13', localTime: '09:30', lastRunDate: null }), true)
	})

	it('no corre antes de la hora, dos veces el mismo día ni si está desactivada', () => {
		assert.equal(isDue({ autoRun: AUTO_RUN, today: '2026-10-13', localTime: '05:59', lastRunDate: '2026-10-12' }), false)
		assert.equal(isDue({ autoRun: AUTO_RUN, today: '2026-10-13', localTime: '07:00', lastRunDate: '2026-10-13' }), false)
		assert.equal(isDue({ autoRun: { ...AUTO_RUN, enabled: false }, today: '2026-10-13', localTime: '07:00', lastRunDate: null }), false)
	})
})

describe('createRunGuard', () => {
	it('permite una sola corrida a la vez y libera al terminar, aunque falle', async () => {
		const guard = createRunGuard()
		let release: () => void = () => undefined
		const first = guard.exclusive(() => new Promise<string>(resolve => { release = () => resolve('primera') }))
		assert.equal(guard.isBusy(), true)
		await assert.rejects(guard.exclusive(() => Promise.resolve('segunda')), RunInProgressError)
		release()
		assert.equal(await first, 'primera')
		assert.equal(guard.isBusy(), false)
		await assert.rejects(guard.exclusive(() => Promise.reject(new Error('falla'))), /falla/)
		assert.equal(guard.isBusy(), false)
	})
})
