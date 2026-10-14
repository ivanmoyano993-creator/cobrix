export const LOCAL_TIME_ZONE = 'America/Caracas'

export const LOCAL_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
	timeZone: LOCAL_TIME_ZONE,
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
})

export const CALENDAR_DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
	timeZone: LOCAL_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
})

export const SCHEDULER_INTERVAL_MS = 60_000
