import { currentPeriod, today } from '../../../shared/dates.ts'
import type { Clock } from '../../application/interfaces/run.interface.ts'
import { LOCAL_TIME_FORMAT } from '../constants/clock.constants.ts'

export function createSystemClock(now: () => Date = () => new Date()): Clock {
	return {
		now: () => now().toISOString(),
		today,
		currentPeriod,
		localTime: () => LOCAL_TIME_FORMAT.format(now()),
	}
}
