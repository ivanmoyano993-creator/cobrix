import { today } from '../../shared/dates.ts'
import type { Settings } from '../../cobrix/domain/interfaces/settings.interface.ts'
import { formatCents } from '../../cobrix/domain/money.ts'
import { NOT_CONFIGURED } from '../constants/labels.constants.ts'
import { date } from '../format.ts'
import { html, type Raw } from '../html.ts'
import { facts } from './ui.ts'

export function providerFacts(settings: Settings, simulatorUrl: string): Raw {
	const { provider, importRules, caps, autoRun } = settings
	return facts([
		['URL de la API', provider.baseUrl ? html`<span class="mono">${provider.baseUrl}</span>` : NOT_CONFIGURED],
		['Usuario', provider.username || NOT_CONFIGURED],
		['Documentación', html`<a href="${simulatorUrl}/docs" target="_blank" rel="noopener">Swagger</a> · <a href="${simulatorUrl}/openapi.json" target="_blank" rel="noopener">openapi.json</a>`],
		['Estados que se importan', importRules.importableStatuses.join(', ') || 'Ninguno'],
		['Ventana', importRules.windowMonths === null ? 'Sin ventana: todas las cuotas pendientes' : `Desde el mes actual menos ${importRules.windowMonths} meses`],
		['Cuotas recientes', importRules.maxRecentPerContract === null ? 'Todas' : `Las ${importRules.maxRecentPerContract} más recientes por contrato`],
		['Días de gracia', `${importRules.graceDays}`],
		['Topes por corrida', capsLabel(caps.maxNewInvoices, caps.maxNewAmountCents)],
		['Documentos excluidos', importRules.excludedDocumentTypes.join(', ') || 'Ninguno'],
		['Corrida automática', autoRun.enabled ? `Activa todos los días a las ${autoRun.time} (hora de Caracas)` : 'Apagada'],
		['Fecha de hoy', date(today())],
	])
}

function capsLabel(maxInvoices: number | null, maxAmountCents: number | null): string {
	const parts = [
		maxInvoices === null ? null : `${maxInvoices} facturas nuevas`,
		maxAmountCents === null ? null : `${formatCents(maxAmountCents)} nuevos`,
	].filter(part => part !== null)
	return parts.length > 0 ? `Hasta ${parts.join(' y ')}` : 'Sin topes'
}
