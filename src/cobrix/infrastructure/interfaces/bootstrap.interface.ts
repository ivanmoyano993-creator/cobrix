import type { Clock, RunRequest } from '../../application/interfaces/run.interface.ts'
import type { ProviderConfig } from '../../domain/interfaces/provider.interface.ts'
import type { Persistence } from '../../domain/interfaces/repositories.interface.ts'
import type { Run } from '../../domain/interfaces/run.interface.ts'

export interface CobrixOptions {
	readonly dataDir: string
	readonly secretKeyEnv: string | undefined
	readonly defaultProvider: ProviderConfig | null
	readonly clock?: Clock
}

export interface Cobrix {
	readonly persistence: Persistence
	runImport(request: RunRequest): Promise<Run>
	runUpdatePaid(request: RunRequest): Promise<Run>
	isRunning(): boolean
	startScheduler(): void
	close(): void
}
