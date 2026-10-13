export interface IntervalSchedulerOptions {
	readonly everyMs: number
	readonly tick: () => Promise<void>
	readonly onError: (error: Error) => void
}

export interface Scheduler {
	start(): void
	stop(): void
}
