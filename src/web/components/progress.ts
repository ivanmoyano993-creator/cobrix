import type { RunProgress } from '../../cobrix/application/interfaces/progress.interface.ts'
import { RUN_IN_PROGRESS_NOTE } from '../constants/copy.constants.ts'
import { PROGRESS_SUFFIX, ROUTE } from '../constants/routes.constants.ts'
import { plural } from '../format.ts'
import { html, type Raw } from '../html.ts'

export function runningBanner(progress: RunProgress | null): Raw | string {
	if (progress === null) return ''
	return html`<div class="flash info" role="status">${RUN_IN_PROGRESS_NOTE} <a href="${ROUTE.Runs}/${progress.runId}">Ver progreso de la corrida #${progress.runId}</a></div>`
}

export function progressCard(progress: RunProgress): Raw {
	return html`<section class="card progress-card" data-progress-url="${ROUTE.Runs}/${progress.runId}${PROGRESS_SUFFIX}" aria-live="polite">
		<div class="body">
			<strong>Procesando contratos del administrador…</strong>
			<progress max="${progress.total ?? 1}"${progress.total === null ? '' : html` value="${progress.done}"`}></progress>
			<div class="progress-meta"><span data-progress-count>${countLabel(progress)}</span><span class="muted" data-progress-label>${progress.label ?? 'Iniciando sesión en el administrador…'}</span></div>
			<noscript><meta http-equiv="refresh" content="2"></noscript>
		</div>
	</section>`
}

function countLabel(progress: RunProgress): string {
	return progress.total === null ? 'Leyendo la lista de contratos…' : `${progress.done} de ${plural(progress.total, 'contrato', 'contratos')}`
}
