export const IMPORT_CONFIRM = 'Se van a crear en Cobrix los clientes y las facturas abiertas de las cuotas pendientes que cumplan las reglas. Lo ya importado no se duplica.'

export const UPDATE_PAID_CONFIRM = 'Se van a marcar pagadas las facturas que el ISP ya cobró por completo. Los abonos parciales y las cuotas sin evidencia siguen abiertas.'

export const RUN_IN_PROGRESS_NOTE = 'Hay una corrida en curso. Las acciones se habilitan cuando termine.'

export const NO_RUNS = {
	title: 'Todavía no hay corridas',
	text: 'Empieza con «Simular importación»: muestra qué se importaría sin escribir nada. Cuando el resultado te convenza, importa.',
} as const

export const FAILED_RUN_HINT = 'Revisa la URL, el usuario y la contraseña del proveedor en Configuración y vuelve a intentarlo.'

export const NO_CUSTOMERS = {
	title: 'Todavía no hay clientes',
	text: 'Los clientes llegan con la importación: cada titular con cuotas pendientes que cumplan las reglas se crea una sola vez, aunque tenga varios contratos.',
} as const

export const NO_MATCH_TEXT = 'Prueba con parte del nombre o con el documento, con o sin guiones (V-12345678, J-40123456-7).'

export const INVOICE_DATES_NOTE = 'El vencimiento es el primer día del periodo de la cuota: el administrador de facturas no da un vencimiento por cuota. El corte suma los días de gracia configurados.'

export const OVERDUE_ALERT_DAYS = 30

export const NO_ITEMS = 'Esta corrida no dejó filas: no había cuotas ni facturas que revisar.'
