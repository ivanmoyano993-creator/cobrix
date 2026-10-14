import type { RunObserver } from '../interfaces/progress.interface.ts'

export const SILENT_OBSERVER: RunObserver = {
	started: () => undefined,
	stepped: () => undefined,
	finished: () => undefined,
}

export const CONTRACT_STEP_LABEL = 'Contrato'
