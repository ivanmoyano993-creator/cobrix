import type { RunKind } from '../../domain/types/run.types.ts'
import type { ProgressListener, StartListener } from '../types/progress.types.ts'

export interface RunStartedEvent {
	readonly runId: number
	readonly kind: RunKind
	readonly dryRun: boolean
}

export interface RunStepEvent {
	readonly runId: number
	readonly done: number
	readonly total: number
	readonly label: string
}

export interface RunProgress {
	readonly runId: number
	readonly kind: RunKind
	readonly dryRun: boolean
	readonly done: number
	readonly total: number | null
	readonly label: string | null
	readonly finished: boolean
}

export interface RunObserver {
	started(event: RunStartedEvent): void
	stepped(event: RunStepEvent): void
	finished(runId: number): void
}

export interface RunProgressReader {
	current(): RunProgress | null
	snapshot(runId: number): RunProgress | null
	subscribe(runId: number, listener: ProgressListener): () => void
}

export interface RunProgressHub extends RunObserver, RunProgressReader {
	onStarted(listener: StartListener): () => void
}
