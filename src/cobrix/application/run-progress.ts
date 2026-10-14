import type { RunProgress, RunProgressHub } from './interfaces/progress.interface.ts'
import type { ProgressListener, StartListener } from './types/progress.types.ts'

export function createRunProgressHub(): RunProgressHub {
	const runs = new Map<number, RunProgress>()
	const listeners = new Map<number, Set<ProgressListener>>()
	const startListeners = new Set<StartListener>()

	function publish(progress: RunProgress): void {
		for (const listener of listeners.get(progress.runId) ?? []) listener(progress)
	}

	return {
		started(event) {
			runs.set(event.runId, { ...event, done: 0, total: null, label: null, finished: false })
			for (const listener of startListeners) listener(event.runId)
		},
		stepped(event) {
			const current = runs.get(event.runId)
			if (current === undefined) return
			const next = { ...current, done: event.done, total: event.total, label: event.label }
			runs.set(event.runId, next)
			publish(next)
		},
		finished(runId) {
			const current = runs.get(runId)
			runs.delete(runId)
			if (current !== undefined) publish({ ...current, finished: true })
			listeners.delete(runId)
		},
		current: () => runs.values().next().value ?? null,
		snapshot: runId => runs.get(runId) ?? null,
		subscribe(runId, listener) {
			const set = listeners.get(runId) ?? new Set<ProgressListener>()
			set.add(listener)
			listeners.set(runId, set)
			return () => {
				set.delete(listener)
			}
		},
		onStarted(listener) {
			startListeners.add(listener)
			return () => {
				startListeners.delete(listener)
			}
		},
	}
}
