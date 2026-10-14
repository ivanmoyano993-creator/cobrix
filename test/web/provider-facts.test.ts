import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Clock } from '../../src/cobrix/application/interfaces/run.interface.ts'
import { DEFAULT_SETTINGS } from '../../src/cobrix/domain/constants/settings.constants.ts'
import { providerFacts } from '../../src/web/components/provider-facts.ts'

function clock(businessDay: string, calendarDay: string): Clock {
	return { now: () => `${calendarDay}T12:00:00.000Z`, currentPeriod: () => businessDay.slice(0, 7), today: () => businessDay, localTime: () => '08:00', calendarDay: () => calendarDay }
}

describe('providerFacts: fecha del sandbox', () => {
	it('si la fecha de negocio está fijada y difiere del día real, lo aclara y muestra el día en Caracas', () => {
		const markup = providerFacts(DEFAULT_SETTINGS, 'http://isp.test', clock('2026-10-13', '2026-10-14')).html
		assert.match(markup, /<dt>Fecha del sandbox<\/dt><dd>13 oct 2026<span class="sub">fecha fija de la prueba · hoy en Caracas: 14 oct 2026<\/span><\/dd>/)
	})

	it('si coinciden, muestra solo la fecha', () => {
		const markup = providerFacts(DEFAULT_SETTINGS, 'http://isp.test', clock('2026-10-14', '2026-10-14')).html
		assert.match(markup, /<dt>Fecha del sandbox<\/dt><dd>14 oct 2026<\/dd>/)
		assert.doesNotMatch(markup, /fecha fija de la prueba/)
	})
})
