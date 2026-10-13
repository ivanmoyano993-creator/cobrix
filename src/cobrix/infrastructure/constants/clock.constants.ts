export const LOCAL_TIME_ZONE = 'America/Caracas'

export const LOCAL_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
	timeZone: LOCAL_TIME_ZONE,
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
})

export const SCHEDULER_INTERVAL_MS = 60_000
