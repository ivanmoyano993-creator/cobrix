export interface ImportSummaryInput {
	readonly dryRun: boolean
	readonly imported: number
	readonly amountCents: number
	readonly customersCreated: number
	readonly alreadyImported: number
	readonly held: number
}

export interface PaidSummaryInput {
	readonly dryRun: boolean
	readonly paid: number
	readonly partial: number
	readonly stillOpen: number
}
