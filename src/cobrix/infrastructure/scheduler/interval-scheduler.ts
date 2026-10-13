import type { IntervalSchedulerOptions, Scheduler } from '../interfaces/scheduler.interface.ts'

export function createIntervalScheduler(options: IntervalSchedulerOptions): Scheduler {
	let timer: ReturnType<typeof setInterval> | null = null
	let running = false

	function check(): void {
		if (running) return
		running = true
		options.tick()
			.catch((error: Error) => options.onError(error))
			.finally(() => { running = false })
	}

	return {
		start() {
			if (timer === null) timer = setInterval(check, options.everyMs)
		},
		stop() {
			if (timer !== null) clearInterval(timer)
			timer = null
		},
	}
}
