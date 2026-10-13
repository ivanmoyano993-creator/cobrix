import type { DatabaseSync } from 'node:sqlite'

import { DOCUMENT_TYPES } from '../../../domain/constants/document.constants.ts'
import { CONTRACT_STATUSES } from '../../../domain/constants/import.constants.ts'
import { DEFAULT_SETTINGS } from '../../../domain/constants/settings.constants.ts'
import type { SettingsRepository } from '../../../domain/interfaces/repositories.interface.ts'
import type { Settings } from '../../../domain/interfaces/settings.interface.ts'
import { LIST_SEPARATOR, SETTINGS_ROW_ID, SQL_FALSE, SQL_TRUE } from '../../constants/sqlite.constants.ts'
import type { SecretBox } from '../../interfaces/persistence.interface.ts'
import { flag, integer, listOf, nullableInteger, text } from '../rows.ts'
import type { SqlRow } from '../../types/sqlite.types.ts'

export function createSqliteSettingsRepository(db: DatabaseSync, secrets: SecretBox): SettingsRepository {
	return {
		get: () => readSettings(db, secrets),
		save: settings => writeSettings(db, secrets, settings),
	}
}

function readSettings(db: DatabaseSync, secrets: SecretBox): Settings {
	const row = db.prepare('SELECT * FROM settings WHERE id = ?').get(SETTINGS_ROW_ID)
	if (row === undefined) return DEFAULT_SETTINGS
	return {
		company: { name: text(row, 'company_name'), rif: text(row, 'company_rif'), collectionEmail: text(row, 'company_email') },
		provider: { baseUrl: text(row, 'provider_url'), username: text(row, 'provider_username'), password: readPassword(row, secrets) },
		importRules: {
			importableStatuses: listOf(row, 'importable_statuses', CONTRACT_STATUSES),
			windowMonths: nullableInteger(row, 'window_months'),
			maxRecentPerContract: nullableInteger(row, 'max_recent_per_contract'),
			graceDays: integer(row, 'grace_days'),
			excludedDocumentTypes: listOf(row, 'excluded_document_types', DOCUMENT_TYPES),
		},
		caps: { maxNewInvoices: nullableInteger(row, 'max_new_invoices'), maxNewAmountCents: nullableInteger(row, 'max_new_amount_cents') },
		autoRun: { enabled: flag(row, 'auto_run_enabled'), time: text(row, 'auto_run_time') },
	}
}

function readPassword(row: SqlRow, secrets: SecretBox): string {
	try {
		return secrets.decrypt(text(row, 'provider_password'))
	} catch {
		throw new Error('No se pudo descifrar la contraseña del proveedor: la clave de cifrado cambió o el dato fue alterado. Vuelve a cargarla en Configuración.')
	}
}

function writeSettings(db: DatabaseSync, secrets: SecretBox, settings: Settings): void {
	const { company, provider, importRules, caps, autoRun } = settings
	db.prepare(`
		INSERT INTO settings (
			id, company_name, company_rif, company_email, provider_url, provider_username, provider_password,
			importable_statuses, window_months, max_recent_per_contract, grace_days, excluded_document_types,
			max_new_invoices, max_new_amount_cents, auto_run_enabled, auto_run_time
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO UPDATE SET
			company_name = excluded.company_name,
			company_rif = excluded.company_rif,
			company_email = excluded.company_email,
			provider_url = excluded.provider_url,
			provider_username = excluded.provider_username,
			provider_password = excluded.provider_password,
			importable_statuses = excluded.importable_statuses,
			window_months = excluded.window_months,
			max_recent_per_contract = excluded.max_recent_per_contract,
			grace_days = excluded.grace_days,
			excluded_document_types = excluded.excluded_document_types,
			max_new_invoices = excluded.max_new_invoices,
			max_new_amount_cents = excluded.max_new_amount_cents,
			auto_run_enabled = excluded.auto_run_enabled,
			auto_run_time = excluded.auto_run_time
	`).run(
		SETTINGS_ROW_ID,
		company.name,
		company.rif,
		company.collectionEmail,
		provider.baseUrl,
		provider.username,
		secrets.encrypt(provider.password),
		importRules.importableStatuses.join(LIST_SEPARATOR),
		importRules.windowMonths,
		importRules.maxRecentPerContract,
		importRules.graceDays,
		importRules.excludedDocumentTypes.join(LIST_SEPARATOR),
		caps.maxNewInvoices,
		caps.maxNewAmountCents,
		autoRun.enabled ? SQL_TRUE : SQL_FALSE,
		autoRun.time,
	)
}
