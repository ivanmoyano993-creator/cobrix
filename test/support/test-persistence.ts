import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { DEFAULT_SETTINGS } from '../../src/cobrix/domain/constants/settings.constants.ts'
import type { Persistence } from '../../src/cobrix/domain/interfaces/repositories.interface.ts'
import type { Settings } from '../../src/cobrix/domain/interfaces/settings.interface.ts'
import { createSqlitePersistence } from '../../src/cobrix/infrastructure/persistence/sqlite-persistence.ts'

export interface TestPersistence {
	readonly persistence: Persistence
	dispose(): void
}

export const TEST_PROVIDER = { baseUrl: 'http://isp.test/api/v1', username: 'cobrix', password: 'cobrix-sandbox' }

export function createTestPersistence(settings: Partial<Settings> = {}): TestPersistence {
	const dir = mkdtempSync(join(tmpdir(), 'cobrix-app-'))
	const persistence = createSqlitePersistence({ path: join(dir, 'cobrix.sqlite'), secretKey: randomBytes(32) })
	persistence.settings.save({ ...DEFAULT_SETTINGS, provider: TEST_PROVIDER, ...settings })
	return {
		persistence,
		dispose() {
			persistence.close()
			rmSync(dir, { recursive: true, force: true })
		},
	}
}
