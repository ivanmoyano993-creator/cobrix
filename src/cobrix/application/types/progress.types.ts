import type { RunProgress } from '../interfaces/progress.interface.ts'

export type ProgressListener = (progress: RunProgress) => void

export type StartListener = (runId: number) => void

export type StepReporter = (done: number, total: number, label: string) => void
