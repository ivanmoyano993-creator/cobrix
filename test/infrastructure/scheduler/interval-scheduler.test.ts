import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

import { createSystemClock } from '../../../src/cobrix/infrastructure/clock/system-clock.ts'
import { createIntervalScheduler } from '../../../src/cobrix/infrastructure/scheduler/interval-scheduler.ts'

describe('createSystemClock', () => {
	it('da la hora local de Caracas (UTC-4) en HH:MM', () => {
		const clock = createSystemClock(() => new Date('2026-10-13T10:30:00Z'))
		assert.equal(clock.localTime(), '06:30')
		assert.equal(clock.now(), '2026-10-13T10:30:00.000Z')
	})

	it('respeta la fecha fijada del sandbox', () => {
		process.env.SANDBOX_TODAY = '2026-10-13'
		const clock = createSystemClock(() => new Date('2030-01-01T12:00:00Z'))
		assert.equal(clock.today(), '2026-10-13')
		assert.equal(clock.currentPeriod(), '2026-10')
	})
})

describe('createIntervalScheduler', () => {
	beforeEach(() => {
		mock.timers.enable({ apis: ['setInterval'] })
	})

	afterEach(() => {
		mock.timers.reset()
	})

	it('revisa en cada intervalo hasta que se detiene', async () => {
		let ticks = 0
		const scheduler = createIntervalScheduler({ everyMs: 1000, tick: () => { ticks++; return Promise.resolve() }, onError: () => undefined })
		scheduler.start()
		for (let i = 0; i < 3; i++) {
			mock.timers.tick(1000)
			await settle()
		}
		assert.equal(ticks, 3)
		scheduler.stop()
		mock.timers.tick(3000)
		assert.equal(ticks, 3)
	})

	it('no se solapa: si una revisión sigue en curso, saltea las siguientes', async () => {
		let ticks = 0
		let release: () => void = () => undefined
		const scheduler = createIntervalScheduler({
			everyMs: 1000,
			tick: () => { ticks++; return new Promise<void>(resolve => { release = resolve }) },
			onError: () => undefined,
		})
		scheduler.start()
		mock.timers.tick(3000)
		assert.equal(ticks, 1)
		release()
		await settle()
		mock.timers.tick(1000)
		assert.equal(ticks, 2)
		scheduler.stop()
	})

	it('un error en la revisión se informa y no detiene el programador', async () => {
		const errors: string[] = []
		let ticks = 0
		const scheduler = createIntervalScheduler({
			everyMs: 1000,
			tick: () => { ticks++; return Promise.reject(new Error('falló')) },
			onError: error => { errors.push(error.message) },
		})
		scheduler.start()
		mock.timers.tick(1000)
		await settle()
		mock.timers.tick(1000)
		await settle()
		assert.equal(ticks, 2)
		assert.deepEqual(errors, ['falló', 'falló'])
		scheduler.stop()
	})
})

function settle(): Promise<void> {
	return new Promise<void>(resolve => { setImmediate(resolve) })
}
