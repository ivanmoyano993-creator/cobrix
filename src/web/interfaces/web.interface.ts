import type { SettingsInput } from '../../cobrix/application/interfaces/settings.interface.ts'
import type { Paged } from '../../cobrix/domain/interfaces/queries.interface.ts'
import type { SettingsErrors } from '../../cobrix/application/types/settings.types.ts'
import type { Cobrix } from '../../cobrix/infrastructure/interfaces/bootstrap.interface.ts'
import type { Raw } from '../html.ts'
import type { Tone } from '../types/web.types.ts'

export interface AppDeps {
	readonly cobrix: Cobrix
	readonly simulatorUrl: string
	readonly assignmentPath: string
}

export interface Badge {
	readonly label: string
	readonly tone: Tone
}

export interface Flash {
	readonly tone: Tone
	readonly text: string
}

export interface LayoutInput {
	readonly title: string
	readonly active: string
	readonly body: Raw
	readonly flash: Flash | undefined
	readonly company: string
}

export interface Page {
	readonly status: number
	readonly title: string
	readonly active: string
	readonly body: Raw
}

export interface Tile {
	readonly label: string
	readonly value: string
	readonly hint?: string
}

export interface ActionButton {
	readonly action: string
	readonly label: string
	readonly primary: boolean
	readonly dryRun: boolean
	readonly confirm: string | null
	readonly disabled: boolean
}

export interface EmptyState {
	readonly title: string
	readonly text: string
	readonly action: Raw | null
}

export interface FieldOptions {
	readonly type?: string
	readonly hint?: string
	readonly placeholder?: string
	readonly inputMode?: string
	readonly autocomplete?: string
	readonly min?: number
	readonly max?: number
}

export interface Choice {
	readonly value: string
	readonly label: string
}

export interface SettingsPageState {
	readonly values: SettingsInput
	readonly errors: SettingsErrors
	readonly notice: Flash | null
	readonly status: number
	readonly hasPassword: boolean
	readonly dirty: boolean
}

export interface PageView<T> extends Paged<T> {
	readonly page: number
	readonly size: number
}

export interface PagerLink {
	readonly path: string
	readonly params: Readonly<Record<string, string>>
}
