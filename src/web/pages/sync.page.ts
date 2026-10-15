import { loadPage, pager } from '../components/pagination.ts'
import { importActions, updatePaidActions } from '../components/run-actions.ts'
import { runningBanner } from '../components/progress.ts'
import { emptyState, runsTable } from '../components/ui.ts'
import { DRY_RUN_NOTE, NO_RUNS } from '../constants/copy.constants.ts'
import { HTTP_STATUS, ROUTE, RUNS_PAGE_SIZE } from '../constants/routes.constants.ts'
import { plural } from '../format.ts'
import { html } from '../html.ts'
import type { AppDeps, Page } from '../interfaces/web.interface.ts'

export function syncPage(deps: AppDeps, page: number): Page {
	const view = loadPage(page, RUNS_PAGE_SIZE, request => deps.cobrix.persistence.queries.listRuns(request))
	const running = deps.cobrix.isRunning()
	return {
		status: HTTP_STATUS.Ok,
		title: 'Sincronización',
		active: ROUTE.Sync,
		body: html`
			<div class="head"><div><h1>Sincronización</h1><p>Las dos corridas que traen los datos del administrador a Cobrix. ${DRY_RUN_NOTE}</p></div></div>
			${runningBanner(deps.cobrix.progress.current())}
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
				<header><h2>Historial de corridas</h2><span class="muted">${plural(view.total, 'corrida', 'corridas')}, la más reciente primero</span></header>
				${view.items.length > 0 ? runsTable(view.items) : emptyState({ title: NO_RUNS.title, text: NO_RUNS.text, action: null })}
				${pager(view, { path: ROUTE.Sync, params: {} })}
			</section>`,
	}
}
