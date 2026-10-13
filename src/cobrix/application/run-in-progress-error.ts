import { RUN_IN_PROGRESS } from './constants/run.constants.ts'

export class RunInProgressError extends Error {
	constructor() {
		super(RUN_IN_PROGRESS)
		this.name = 'RunInProgressError'
	}
}
