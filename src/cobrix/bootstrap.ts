import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { testConnection } from './application/connection.ts'
import { runImport } from './application/import-run.ts'
import { applySettingsInput, validateProviderInput } from './application/settings-form.ts'
import type { RunProgressHub } from './application/interfaces/progress.interface.ts'
import type { RunGuard, ScheduledRunDeps } from './application/interfaces/run.interface.ts'
import { createRunGuard } from './application/run-guard.ts'
import { createRunProgressHub } from './application/run-progress.ts'
import { runScheduledIfDue } from './application/scheduled-run.ts'
import { runUpdatePaid } from './application/update-paid-run.ts'
import { DEFAULT_SETTINGS } from './domain/constants/settings.constants.ts'
import type { ProviderConfig } from './domain/interfaces/provider.interface.ts'
import type { Persistence } from './domain/interfaces/repositories.interface.ts'
import type { Run } from './domain/interfaces/run.interface.ts'
import type { Settings } from './domain/interfaces/settings.interface.ts'
import { createSystemClock } from './infrastructure/clock/system-clock.ts'
import { DATABASE_FILE, SCHEDULER_ERROR_PREFIX, SECRET_KEY_FILE } from './infrastructure/constants/bootstrap.constants.ts'
import { SCHEDULER_INTERVAL_MS } from './infrastructure/constants/clock.constants.ts'
import { createHttpBillingProvider } from './infrastructure/http/http-billing-provider.ts'
import { withLatency } from './infrastructure/http/latency-provider.ts'
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
	const progress = createRunProgressHub()
	const deps: ScheduledRunDeps = {
		...persistence,
		providerFor: config => withLatency(createHttpBillingProvider(config), options.simulatedLatencyMs ?? 0),
		clock: options.clock ?? createSystemClock(),
		guard,
		observer: progress,
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
		progress,
		runImport: request => guard.exclusive(() => runImport(deps, request)),
		runUpdatePaid: request => guard.exclusive(() => runUpdatePaid(deps, request)),
		startImport: request => startInBackground(guard, progress, () => runImport(deps, request)),
		startUpdatePaid: request => startInBackground(guard, progress, () => runUpdatePaid(deps, request)),
		isRunning: () => guard.isBusy(),
		currentSettings: () => readableSettings(persistence),
		updateSettings(input) {
			const result = applySettingsInput(readableSettings(persistence), input)
			if (result.ok) persistence.settings.save(result.settings)
			return result
		},
		testConnection(input) {
			const provider = validateProviderInput(readableSettings(persistence), input)
			if (!provider.ok) return Promise.resolve(provider)
			return testConnection(deps.providerFor(provider.provider))
		},
		startScheduler: () => scheduler.start(),
		close() {
			scheduler.stop()
			persistence.close()
		},
	}
}

function startInBackground(guard: RunGuard, progress: RunProgressHub, work: () => Promise<Run>): Promise<number> {
	return new Promise((resolve, reject) => {
		const stop = progress.onStarted(runId => {
			stop()
			resolve(runId)
		})
		guard.exclusive(work).catch((error: Error) => {
			stop()
			reject(error)
		})
	})
}

function readableSettings(persistence: Persistence): Settings {
	try {
		return persistence.settings.get()
	} catch {
		return DEFAULT_SETTINGS
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
