import { DOCUMENT_TYPES } from '../domain/constants/document.constants.ts'
import { CONTRACT_STATUSES } from '../domain/constants/import.constants.ts'
import { GRACE_DAYS_RANGE, MAX_RECENT_RANGE, MIN_NEW_INVOICES, WINDOW_MONTH_OPTIONS } from '../domain/constants/settings.constants.ts'
import { normalizeDocument } from '../domain/document.ts'
import { isOneOf } from '../domain/guards.ts'
import type { RunCaps, ImportRules } from '../domain/interfaces/import.interface.ts'
import type { AutoRunSettings, CompanySettings, Settings } from '../domain/interfaces/settings.interface.ts'
import { CENTS_PER_UNIT } from '../domain/constants/money.constants.ts'
import { toCents } from '../domain/money.ts'
import {
	ALLOWED_URL_PROTOCOLS,
	AMOUNT_PATTERN,
	DOMAIN_SEPARATOR,
	EMAIL_SEPARATOR,
	INTEGER_PATTERN,
	SETTINGS_ERROR,
	TIME_PATTERN,
	WHITESPACE,
} from './constants/settings.constants.ts'
import type { SettingsInput } from './interfaces/settings.interface.ts'
import type { ProviderValidation, SettingsErrors, SettingsValidation } from './types/settings.types.ts'

export function applySettingsInput(current: Settings, input: SettingsInput): SettingsValidation {
	const errors: SettingsErrors = {}
	const provider = validateProviderInput(current, input)
	if (!provider.ok) Object.assign(errors, provider.errors)
	const importRules = readImportRules(input, errors)
	const caps = readCaps(input, errors)
	const company = readCompany(input, errors)
	const autoRun = readAutoRun(input, errors)
	if (!provider.ok || Object.keys(errors).length > 0) return { ok: false, errors }
	return { ok: true, settings: { company, provider: provider.provider, importRules, caps, autoRun } }
}

export function settingsToInput(settings: Settings): SettingsInput {
	const { company, provider, importRules, caps, autoRun } = settings
	return {
		companyName: company.name,
		companyRif: company.rif,
		companyEmail: company.collectionEmail,
		providerUrl: provider.baseUrl,
		providerUsername: provider.username,
		providerPassword: '',
		importableStatuses: importRules.importableStatuses,
		windowMonths: optionalText(importRules.windowMonths),
		maxRecentPerContract: optionalText(importRules.maxRecentPerContract),
		graceDays: String(importRules.graceDays),
		maxNewInvoices: optionalText(caps.maxNewInvoices),
		maxNewAmount: caps.maxNewAmountCents === null ? '' : (caps.maxNewAmountCents / CENTS_PER_UNIT).toFixed(2).replace('.', ','),
		excludedDocumentTypes: importRules.excludedDocumentTypes,
		autoRunEnabled: autoRun.enabled,
		autoRunTime: autoRun.time,
	}
}

export function validateProviderInput(current: Settings, input: SettingsInput): ProviderValidation {
	const errors: SettingsErrors = {}
	const baseUrl = input.providerUrl.trim()
	const username = input.providerUsername.trim()
	const password = input.providerPassword === '' ? current.provider.password : input.providerPassword
	if (baseUrl === '' || !URL.canParse(baseUrl)) errors.providerUrl = baseUrl === '' ? SETTINGS_ERROR.ProviderUrlRequired : SETTINGS_ERROR.ProviderUrlInvalid
	else if (!ALLOWED_URL_PROTOCOLS.includes(new URL(baseUrl).protocol)) errors.providerUrl = SETTINGS_ERROR.ProviderUrlInvalid
	if (username === '') errors.providerUsername = SETTINGS_ERROR.UsernameRequired
	if (password === '') errors.providerPassword = SETTINGS_ERROR.PasswordRequired
	if (Object.keys(errors).length > 0) return { ok: false, errors }
	return { ok: true, provider: { baseUrl, username, password } }
}

function readImportRules(input: SettingsInput, errors: SettingsErrors): ImportRules {
	const importableStatuses = input.importableStatuses.filter(status => isOneOf(CONTRACT_STATUSES, status))
	if (input.importableStatuses.length === 0) errors.importableStatuses = SETTINGS_ERROR.StatusesRequired
	else if (importableStatuses.length !== input.importableStatuses.length) errors.importableStatuses = SETTINGS_ERROR.StatusUnknown

	const excludedDocumentTypes = input.excludedDocumentTypes.filter(type => isOneOf(DOCUMENT_TYPES, type))
	if (excludedDocumentTypes.length !== input.excludedDocumentTypes.length) errors.excludedDocumentTypes = SETTINGS_ERROR.DocumentTypeUnknown

	const windowMonths = optionalInteger(input.windowMonths)
	if (windowMonths === undefined || (windowMonths !== null && !WINDOW_MONTH_OPTIONS.includes(windowMonths))) errors.windowMonths = SETTINGS_ERROR.WindowInvalid

	const maxRecentPerContract = optionalInteger(input.maxRecentPerContract)
	if (maxRecentPerContract === undefined || (maxRecentPerContract !== null && !inRange(maxRecentPerContract, MAX_RECENT_RANGE))) {
		errors.maxRecentPerContract = SETTINGS_ERROR.MaxRecentInvalid
	}

	const graceDays = optionalInteger(input.graceDays)
	if (graceDays === undefined || graceDays === null || !inRange(graceDays, GRACE_DAYS_RANGE)) errors.graceDays = SETTINGS_ERROR.GraceDaysInvalid

	return {
		importableStatuses,
		windowMonths: windowMonths ?? null,
		maxRecentPerContract: maxRecentPerContract ?? null,
		graceDays: graceDays ?? GRACE_DAYS_RANGE.min,
		excludedDocumentTypes,
	}
}

function readCaps(input: SettingsInput, errors: SettingsErrors): RunCaps {
	const maxNewInvoices = optionalInteger(input.maxNewInvoices)
	if (maxNewInvoices === undefined || (maxNewInvoices !== null && maxNewInvoices < MIN_NEW_INVOICES)) errors.maxNewInvoices = SETTINGS_ERROR.MaxInvoicesInvalid

	const amount = input.maxNewAmount.trim()
	const maxNewAmountCents = amount === '' ? null : amountCents(amount)
	if (maxNewAmountCents === undefined) errors.maxNewAmount = SETTINGS_ERROR.MaxAmountInvalid

	return { maxNewInvoices: maxNewInvoices ?? null, maxNewAmountCents: maxNewAmountCents ?? null }
}

function readCompany(input: SettingsInput, errors: SettingsErrors): CompanySettings {
	const rif = input.companyRif.trim()
	const collectionEmail = input.companyEmail.trim()
	if (rif !== '' && normalizeDocument(rif) === null) errors.companyRif = SETTINGS_ERROR.RifInvalid
	if (collectionEmail !== '' && !isEmail(collectionEmail)) errors.companyEmail = SETTINGS_ERROR.EmailInvalid
	return { name: input.companyName.trim(), rif, collectionEmail }
}

function readAutoRun(input: SettingsInput, errors: SettingsErrors): AutoRunSettings {
	const time = input.autoRunTime.trim()
	if (!TIME_PATTERN.test(time)) errors.autoRunTime = SETTINGS_ERROR.TimeInvalid
	return { enabled: input.autoRunEnabled, time }
}

function optionalText(value: number | null): string {
	return value === null ? '' : String(value)
}

function optionalInteger(raw: string): number | null | undefined {
	const value = raw.trim()
	if (value === '') return null
	return INTEGER_PATTERN.test(value) ? Number(value) : undefined
}

function amountCents(raw: string): number | undefined {
	if (!AMOUNT_PATTERN.test(raw)) return undefined
	const cents = toCents(Number(raw.replace(',', '.')))
	return cents !== null && cents > 0 ? cents : undefined
}

function inRange(value: number, range: { readonly min: number; readonly max: number }): boolean {
	return value >= range.min && value <= range.max
}

function isEmail(value: string): boolean {
	const parts = value.split(EMAIL_SEPARATOR)
	const [local, domain] = parts
	if (parts.length !== 2 || !local || !domain || WHITESPACE.test(value)) return false
	const dot = domain.lastIndexOf(DOMAIN_SEPARATOR)
	return dot > 0 && dot < domain.length - 1
}
