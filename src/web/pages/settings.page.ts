import type { ConnectionCheck } from '../../cobrix/application/types/settings.types.ts'
import { DOCUMENT_TYPES } from '../../cobrix/domain/constants/document.constants.ts'
import { CONTRACT_STATUSES } from '../../cobrix/domain/constants/import.constants.ts'
import { GRACE_DAYS_RANGE, MAX_RECENT_RANGE, MIN_NEW_INVOICES, WINDOW_MONTH_OPTIONS } from '../../cobrix/domain/constants/settings.constants.ts'
import { checkboxGroup, field, selectField, toggle } from '../components/form-fields.ts'
import { ROUTE } from '../constants/routes.constants.ts'
import {
	AUTO_RUN_HINT,
	CAPS_HINT,
	DOCUMENT_TYPE_LABEL,
	GRACE_HINT,
	PASSWORD_MISSING_PLACEHOLDER,
	PASSWORD_PLACEHOLDER,
	RECENT_HINT,
	SETTINGS_INVALID,
	STATUS_HINT,
	WINDOW_HINT,
} from '../constants/settings-form.constants.ts'
import { TONE } from '../constants/ui.constants.ts'
import { html } from '../html.ts'
import type { Choice, Flash, Page, SettingsPageState } from '../interfaces/web.interface.ts'

export function settingsPage(state: SettingsPageState): Page {
	const { values, errors } = state
	const hasErrors = Object.keys(errors).length > 0
	return {
		status: state.status,
		title: 'Configuración',
		active: ROUTE.Settings,
		body: html`
			<div class="head"><div><h1>Configuración</h1><p>Datos de la empresa, el acceso al administrador de facturas y las reglas de cada corrida.</p></div></div>
			${hasErrors ? html`<div class="alert" role="alert"><strong>${SETTINGS_INVALID}</strong></div>` : ''}
			${state.notice ? html`<div class="flash ${state.notice.tone}" role="status">${state.notice.text}</div>` : ''}
			<form class="settings" method="post" action="${ROUTE.Settings}" novalidate>
				<div class="cards">
					<section class="card">
						<header><h2>Empresa</h2></header>
						<div class="body">
							${field('companyName', 'Nombre', values.companyName, errors.companyName)}
							${field('companyRif', 'RIF', values.companyRif, errors.companyRif, { placeholder: 'Ej.: J-12345678-9' })}
							${field('companyEmail', 'Correo de cobranza', values.companyEmail, errors.companyEmail, { type: 'email', autocomplete: 'email' })}
						</div>
					</section>
					<section class="card">
						<header><div><h2>Proveedor</h2><p>Administrador de facturas del ISP</p></div></header>
						<div class="body">
							${field('providerUrl', 'URL de la API', values.providerUrl, errors.providerUrl, { type: 'url', placeholder: 'Ej.: http://127.0.0.1:4310/api/v1' })}
							${field('providerUsername', 'Usuario', values.providerUsername, errors.providerUsername, { autocomplete: 'username' })}
							${field('providerPassword', 'Contraseña', '', errors.providerPassword, { type: 'password', autocomplete: 'new-password', placeholder: state.hasPassword ? PASSWORD_PLACEHOLDER : PASSWORD_MISSING_PLACEHOLDER })}
							<div class="actions"><button class="btn" type="submit" formaction="${ROUTE.TestConnection}">Probar conexión</button><small class="muted">Usa lo escrito acá, sin guardarlo.</small></div>
						</div>
					</section>
				</div>
				<section class="card">
					<header><div><h2>Importación</h2><p>Qué cuotas se convierten en facturas de Cobrix.</p></div></header>
					<div class="body grid2">
						${checkboxGroup('importableStatuses', 'Estados de contrato que se importan', statusChoices(), values.importableStatuses, errors.importableStatuses, STATUS_HINT)}
						${checkboxGroup('excludedDocumentTypes', 'Excluir titulares por tipo de documento', documentChoices(), values.excludedDocumentTypes, errors.excludedDocumentTypes, 'Las cuotas de estos titulares no se importan.')}
						${selectField('windowMonths', 'Ventana de importación', windowChoices(), values.windowMonths, errors.windowMonths, WINDOW_HINT)}
						${field('maxRecentPerContract', 'Máximo de cuotas recientes por contrato', values.maxRecentPerContract, errors.maxRecentPerContract, { type: 'number', min: MAX_RECENT_RANGE.min, max: MAX_RECENT_RANGE.max, hint: RECENT_HINT })}
						${field('graceDays', 'Días de gracia', values.graceDays, errors.graceDays, { type: 'number', min: GRACE_DAYS_RANGE.min, max: GRACE_DAYS_RANGE.max, hint: GRACE_HINT })}
						${field('maxNewInvoices', 'Tope de facturas nuevas por corrida', values.maxNewInvoices, errors.maxNewInvoices, { type: 'number', min: MIN_NEW_INVOICES, hint: CAPS_HINT })}
						${field('maxNewAmount', 'Tope de monto nuevo por corrida (USD)', values.maxNewAmount, errors.maxNewAmount, { inputMode: 'decimal', placeholder: 'Ej.: 1500,00', hint: CAPS_HINT })}
					</div>
				</section>
				<section class="card">
					<header><h2>Corrida automática</h2></header>
					<div class="body grid2">
						${toggle('autoRunEnabled', 'Activar la corrida diaria', values.autoRunEnabled, AUTO_RUN_HINT)}
						${field('autoRunTime', 'Hora (America/Caracas)', values.autoRunTime, errors.autoRunTime, { type: 'time' })}
					</div>
				</section>
				<div class="actions sticky-actions"><button class="btn primary" type="submit">Guardar configuración</button><a class="btn" href="${ROUTE.Settings}">Descartar cambios</a></div>
			</form>`,
	}
}

export function connectionNotice(check: ConnectionCheck): Flash | null {
	if ('errors' in check) return null
	if (check.ok) return { tone: TONE.Ok, text: `Conexión correcta: ${check.contracts} contratos en el administrador de facturas.` }
	return { tone: TONE.Bad, text: `No se pudo conectar: ${check.error}` }
}

function statusChoices(): Choice[] {
	return CONTRACT_STATUSES.map(status => ({ value: status, label: status }))
}

function documentChoices(): Choice[] {
	return DOCUMENT_TYPES.map(type => ({ value: type, label: DOCUMENT_TYPE_LABEL[type] }))
}

function windowChoices(): Choice[] {
	return [{ value: '', label: 'Sin ventana: todas las cuotas' }, ...WINDOW_MONTH_OPTIONS.map(months => ({ value: String(months), label: `Últimos ${months} meses` }))]
}
