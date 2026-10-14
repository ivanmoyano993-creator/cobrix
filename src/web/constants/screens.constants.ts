import type { ScreenPlaceholder } from '../interfaces/web.interface.ts'

export const PENDING_SCREENS: Readonly<Record<string, ScreenPlaceholder>> = {
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
