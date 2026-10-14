export const IMPORT_CONFIRM = 'Se van a crear en Cobrix los clientes y las facturas abiertas de las cuotas pendientes que cumplan las reglas. Lo ya importado no se duplica.'

export const UPDATE_PAID_CONFIRM = 'Se van a marcar pagadas las facturas que el ISP ya cobró por completo. Los abonos parciales y las cuotas sin evidencia siguen abiertas.'

export const RUN_IN_PROGRESS_NOTE = 'Hay una corrida en curso. Las acciones se habilitan cuando termine.'

export const NO_RUNS = {
	title: 'Todavía no hay corridas',
	text: 'Empieza con «Simular importación»: muestra qué se importaría sin escribir nada. Cuando el resultado te convenza, importa.',
} as const

export const FAILED_RUN_HINT = 'Revisa la URL, el usuario y la contraseña del proveedor en Configuración y vuelve a intentarlo.'

export const NO_ITEMS = 'Esta corrida no dejó filas: no había cuotas ni facturas que revisar.'
