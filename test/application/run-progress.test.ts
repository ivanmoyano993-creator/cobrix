import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { RunProgress } from '../../src/cobrix/application/interfaces/progress.interface.ts'
import { createRunProgressHub } from '../../src/cobrix/application/run-progress.ts'
import { RUN_KIND } from '../../src/cobrix/domain/constants/run.constants.ts'

describe('createRunProgressHub', () => {
	it('guarda el avance de la corrida en curso y lo olvida al terminar', () => {
		const hub = createRunProgressHub()
		hub.started({ runId: 7, kind: RUN_KIND.Import, dryRun: false })
		assert.deepEqual(hub.snapshot(7), { runId: 7, kind: RUN_KIND.Import, dryRun: false, done: 0, total: null, label: null, finished: false })
		hub.stepped({ runId: 7, done: 3, total: 27, label: 'Contrato 900103' })
		assert.equal(hub.snapshot(7)?.done, 3)
		assert.equal(hub.snapshot(7)?.total, 27)
		assert.equal(hub.current()?.runId, 7)
		hub.finished(7)
		assert.equal(hub.snapshot(7), null)
		assert.equal(hub.current(), null)
	})

	it('avisa a quien se suscribió a esa corrida, incluido el final, y deja de avisar al desuscribirse', () => {
		const hub = createRunProgressHub()
		const seen: RunProgress[] = []
		hub.started({ runId: 1, kind: RUN_KIND.UpdatePaid, dryRun: true })
		const unsubscribe = hub.subscribe(1, progress => seen.push(progress))
		hub.stepped({ runId: 1, done: 1, total: 2, label: 'Contrato 900101' })
		hub.stepped({ runId: 2, done: 1, total: 2, label: 'otra corrida' })
		hub.finished(1)
		assert.deepEqual(seen.map(progress => [progress.done, progress.finished]), [[1, false], [1, true]])
		unsubscribe()
		hub.started({ runId: 1, kind: RUN_KIND.UpdatePaid, dryRun: true })
		hub.stepped({ runId: 1, done: 2, total: 2, label: 'Contrato 900102' })
		assert.equal(seen.length, 2)
	})

	it('avisa el comienzo de cualquier corrida, para saber su número apenas arranca', () => {
		const hub = createRunProgressHub()
		const started: number[] = []
		const stop = hub.onStarted(runId => started.push(runId))
		hub.started({ runId: 4, kind: RUN_KIND.Import, dryRun: false })
		stop()
		hub.started({ runId: 5, kind: RUN_KIND.Import, dryRun: false })
		assert.deepEqual(started, [4])
	})
})
