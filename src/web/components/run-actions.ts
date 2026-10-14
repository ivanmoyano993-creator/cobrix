import { DRY_RUN_NOTE, IMPORT_CONFIRM, UPDATE_PAID_CONFIRM } from '../constants/copy.constants.ts'
import { ROUTE } from '../constants/routes.constants.ts'
import { html, type Raw } from '../html.ts'
import { actionButton } from './ui.ts'

export function importActions(disabled: boolean): Raw {
	return html`<div class="actions">
		${actionButton({ action: ROUTE.Import, label: 'Simular importación', primary: false, dryRun: true, confirm: null, disabled })}
		${actionButton({ action: ROUTE.Import, label: 'Importar', primary: true, dryRun: false, confirm: IMPORT_CONFIRM, disabled })}
	</div>`
}

export function actionsCard(disabled: boolean): Raw {
	return html`<section class="card">
		<header><div><h2>Acciones</h2><p>${DRY_RUN_NOTE}</p></div></header>
		<div class="body">
			<div class="action-block"><strong>Importar clientes y facturas</strong><p>Crea una factura abierta por cada cuota pendiente que cumpla las reglas.</p>${importActions(disabled)}</div>
			<div class="action-block"><strong>Actualizar pagadas</strong><p>Marca pagadas las facturas que el ISP ya cobró por completo.</p>${updatePaidActions(disabled)}</div>
		</div>
	</section>`
}

export function updatePaidActions(disabled: boolean): Raw {
	return html`<div class="actions">
		${actionButton({ action: ROUTE.UpdatePaid, label: 'Simular actualización', primary: false, dryRun: true, confirm: null, disabled })}
		${actionButton({ action: ROUTE.UpdatePaid, label: 'Actualizar pagadas', primary: true, dryRun: false, confirm: UPDATE_PAID_CONFIRM, disabled })}
	</div>`
}
