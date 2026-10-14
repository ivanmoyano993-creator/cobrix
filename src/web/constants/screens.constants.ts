import type { ScreenPlaceholder } from '../interfaces/web.interface.ts'

export const PENDING_SCREENS: Readonly<Record<string, ScreenPlaceholder>> = {
	'/clientes': {
		title: 'Clientes',
		purpose: 'Tabla de los clientes importados desde el administrador.',
		section: '3.5',
		todo: [
			'Un cliente por cédula o RIF (los contratos del mismo titular se agrupan).',
			'Columnas: nombre, documento, tipo (natural o jurídico), contratos, facturas abiertas y pagadas, deuda y vencimiento más antiguo.',
			'Búsqueda por nombre, cédula o RIF.',
			'Cada fila abre el expediente del cliente.',
		],
	},
	'/clientes/expediente': {
		title: 'Expediente del cliente',
		purpose: 'Todo lo que Cobrix sabe de un cliente.',
		section: '3.6',
		todo: [
			'Datos del cliente: documento, correo, teléfono, origen.',
			'Contratos en el administrador con estado, plan y sucursal.',
			'Facturas: número de Cobrix, cuota del administrador, periodo, vencimiento, corte, total, saldo y estado.',
			'Historial: cliente creado, factura importada, factura pagada en el ISP.',
		],
	},
	'/configuracion': {
		title: 'Configuración',
		purpose: 'Datos de la empresa y del proveedor.',
		section: '3.1',
		todo: [
			'Empresa: nombre, RIF y correo de cobranza.',
			'Proveedor: URL de la API, usuario y contraseña, con un botón «Probar conexión».',
			'Estados de contrato que se importan (por defecto ACTIVO y CORTADO).',
			'Ventana de importación, máximo de cuotas recientes, días de gracia, topes por corrida y exclusión por tipo de documento.',
			'Corrida automática diaria a una hora elegida.',
		],
	},
}

export const CUSTOMER_FILE_SCREEN = '/clientes/expediente'
