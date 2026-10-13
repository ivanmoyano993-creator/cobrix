import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { runImport } from './application/import-run.ts'
import type { ScheduledRunDeps } from './application/interfaces/run.interface.ts'
import { createRunGuard } from './application/run-guard.ts'
import { runScheduledIfDue } from './application/scheduled-run.ts'
import { runUpdatePaid } from './application/update-paid-run.ts'
import type { ProviderConfig } from './domain/interfaces/provider.interface.ts'
import type { Persistence } from './domain/interfaces/repositories.interface.ts'
import { createSystemClock } from './infrastructure/clock/system-clock.ts'
import { DATABASE_FILE, SCHEDULER_ERROR_PREFIX, SECRET_KEY_FILE } from './infrastructure/constants/bootstrap.constants.ts'
import { SCHEDULER_INTERVAL_MS } from './infrastructure/constants/clock.constants.ts'
import { createHttpBillingProvider } from './infrastructure/http/http-billing-provider.ts'
import type { Cobrix, CobrixOptions } from './infrastructure/interfaces/bootstrap.interface.ts'
import { loadSecretKey } from './infrastructure/persistence/secret-box.ts'
import { createSqlitePersistence } from './infrastructure/persistence/sqlite-persistence.ts'
import { createIntervalScheduler } from './infrastructure/scheduler/interval-scheduler.ts'

export function createCobrix(options: CobrixOptions): Cobrix {
	mkdirSync(options.dataDir, { recursive: true })
	const secretKey = loadSecretKey({ envValue: options.secretKeyEnv, keyPath: join(options.dataDir, SECRET_KEY_FILE) })
	const persistence = createSqlitePersistence({ path: join(options.dataDir, DATABASE_FILE), secretKey })
	applyDefaultProvider(persistence, options.defaultProvider)

	const guard = createRunGuard()
	const deps: ScheduledRunDeps = {
		...persistence,
		providerFor: config => createHttpBillingProvider(config),
		clock: options.clock ?? createSystemClock(),
		guard,
	}
	const scheduler = createIntervalScheduler({
		everyMs: SCHEDULER_INTERVAL_MS,
		tick: async () => {
			await runScheduledIfDue(deps)
		},
		onError: error => console.error(SCHEDULER_ERROR_PREFIX, error),
	})

	return {
		persistence,
		runImport: request => guard.exclusive(() => runImport(deps, request)),
		runUpdatePaid: request => guard.exclusive(() => runUpdatePaid(deps, request)),
		isRunning: () => guard.isBusy(),
		startScheduler: () => scheduler.start(),
		close() {
			scheduler.stop()
			persistence.close()
		},
	}
}

function applyDefaultProvider(persistence: Persistence, provider: ProviderConfig | null): void {
	if (provider === null) return
	try {
		const settings = persistence.settings.get()
		if (settings.provider.baseUrl === '') persistence.settings.save({ ...settings, provider })
	} catch {
		return
	}
}
