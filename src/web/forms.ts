import type { SettingsInput } from '../cobrix/application/interfaces/settings.interface.ts'
import { CHECKBOX_ON } from './constants/settings-form.constants.ts'

export function readSettingsForm(form: URLSearchParams): SettingsInput {
	const text = (name: keyof SettingsInput): string => form.get(name) ?? ''
	return {
		companyName: text('companyName'),
		companyRif: text('companyRif'),
		companyEmail: text('companyEmail'),
		providerUrl: text('providerUrl'),
		providerUsername: text('providerUsername'),
		providerPassword: text('providerPassword'),
		importableStatuses: form.getAll('importableStatuses'),
		windowMonths: text('windowMonths'),
		maxRecentPerContract: text('maxRecentPerContract'),
		graceDays: text('graceDays'),
		maxNewInvoices: text('maxNewInvoices'),
		maxNewAmount: text('maxNewAmount'),
		excludedDocumentTypes: form.getAll('excludedDocumentTypes'),
		autoRunEnabled: form.get('autoRunEnabled') === CHECKBOX_ON,
		autoRunTime: text('autoRunTime'),
	}
}
