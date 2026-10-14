import { importActions, updatePaidActions } from '../components/run-actions.ts'
import { emptyState, runsTable } from '../components/ui.ts'
import { NO_RUNS, RUN_IN_PROGRESS_NOTE } from '../constants/copy.constants.ts'
import { HISTORY_RUNS_LIMIT, HTTP_STATUS, ROUTE } from '../constants/routes.constants.ts'
import { html } from '../html.ts'
import type { AppDeps, Page } from '../interfaces/web.interface.ts'

export function syncPage(deps: AppDeps): Page {
	const runs = deps.cobrix.persistence.queries.listRuns(HISTORY_RUNS_LIMIT)
	const running = deps.cobrix.isRunning()
	return {
		status: HTTP_STATUS.Ok,
		title: 'Sincronización',
		active: ROUTE.Sync,
		body: html`
			<div class="head"><div><h1>Sincronización</h1><p>Las dos corridas que traen los datos del administrador a Cobrix. Cada una se puede simular antes: hace exactamente lo mismo pero no escribe nada.</p></div></div>
			${running ? html`<div class="flash info" role="status">${RUN_IN_PROGRESS_NOTE}</div>` : ''}
			<div class="cards">
				<section class="card">
					<header><div><h2>Importar clientes y facturas</h2><p>Una factura abierta por cada cuota pendiente que cumpla las reglas, y su cliente si no existe.</p></div></header>
					<div class="body">${importActions(running)}</div>
				</section>
				<section class="card">
					<header><div><h2>Actualizar pagadas</h2><p>Revisa cada factura abierta contra el libro de cuotas del ISP.</p></div></header>
					<div class="body">${updatePaidActions(running)}</div>
				</section>
			</div>
			<section class="card">
				<header><h2>Historial de corridas</h2><span class="muted">Las ${HISTORY_RUNS_LIMIT} más recientes</span></header>
				${runs.length > 0 ? runsTable(runs) : emptyState({ title: NO_RUNS.title, text: NO_RUNS.text, action: null })}
			</section>`,
	}
}
