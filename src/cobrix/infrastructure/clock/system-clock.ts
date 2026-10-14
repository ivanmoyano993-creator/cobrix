import { currentPeriod, today } from '../../../shared/dates.ts'
import type { Clock } from '../../application/interfaces/run.interface.ts'
import { CALENDAR_DAY_FORMAT, LOCAL_TIME_FORMAT } from '../constants/clock.constants.ts'

export function createSystemClock(now: () => Date = () => new Date()): Clock {
	return {
		now: () => now().toISOString(),
		today,
		currentPeriod,
		calendarDay: () => CALENDAR_DAY_FORMAT.format(now()),
		localTime: () => LOCAL_TIME_FORMAT.format(now()),
	}
}
