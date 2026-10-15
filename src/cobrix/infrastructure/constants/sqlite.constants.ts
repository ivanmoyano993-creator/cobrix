export const SETTINGS_ROW_ID = 1

export const LIST_SEPARATOR = ','

export const SQL_TRUE = 1

export const SQL_FALSE = 0

export const INVOICE_SELECT = 'SELECT invoices.*, customers.name AS customer_name FROM invoices JOIN customers ON customers.id = invoices.customer_id'

export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS settings (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	company_name TEXT NOT NULL,
	company_rif TEXT NOT NULL,
	company_email TEXT NOT NULL,
	provider_url TEXT NOT NULL,
	provider_username TEXT NOT NULL,
	provider_password TEXT NOT NULL,
	importable_statuses TEXT NOT NULL,
	window_months INTEGER,
	max_recent_per_contract INTEGER,
	grace_days INTEGER NOT NULL,
	excluded_document_types TEXT NOT NULL,
	max_new_invoices INTEGER,
	max_new_amount_cents INTEGER,
	auto_run_enabled INTEGER NOT NULL,
	auto_run_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
	id TEXT PRIMARY KEY,
	document_type TEXT,
	person_kind TEXT NOT NULL,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	phone TEXT NOT NULL,
	origin TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contracts (
	id INTEGER PRIMARY KEY,
	customer_id TEXT NOT NULL REFERENCES customers(id),
	code TEXT NOT NULL,
	status TEXT NOT NULL,
	plan TEXT NOT NULL,
	price_cents INTEGER NOT NULL,
	branch TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	external_id TEXT NOT NULL UNIQUE,
	customer_id TEXT NOT NULL REFERENCES customers(id),
	contract_id INTEGER NOT NULL REFERENCES contracts(id),
	period TEXT NOT NULL,
	due_date TEXT NOT NULL,
	cutoff_date TEXT NOT NULL,
	total_cents INTEGER NOT NULL,
	balance_cents INTEGER NOT NULL,
	status TEXT NOT NULL,
	paid_at TEXT,
	paid_by_invoice_id INTEGER,
	paid_by_invoice_number TEXT,
	imported_run_id INTEGER NOT NULL,
	created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS invoices_by_status ON invoices(status);
CREATE INDEX IF NOT EXISTS invoices_by_customer ON invoices(customer_id);

CREATE TABLE IF NOT EXISTS runs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	kind TEXT NOT NULL,
	dry_run INTEGER NOT NULL,
	trigger TEXT NOT NULL,
	status TEXT NOT NULL,
	started_at TEXT NOT NULL,
	finished_at TEXT,
	summary TEXT,
	error TEXT
);

CREATE TABLE IF NOT EXISTS run_counters (
	run_id INTEGER NOT NULL REFERENCES runs(id),
	name TEXT NOT NULL,
	value INTEGER NOT NULL,
	PRIMARY KEY (run_id, name)
);

CREATE TABLE IF NOT EXISTS run_items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	run_id INTEGER NOT NULL REFERENCES runs(id),
	contract_id INTEGER,
	external_id TEXT,
	customer_name TEXT,
	period TEXT,
	amount_cents INTEGER,
	outcome TEXT NOT NULL,
	detail TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS run_items_by_run ON run_items(run_id);

CREATE TABLE IF NOT EXISTS history (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	customer_id TEXT NOT NULL REFERENCES customers(id),
	kind TEXT NOT NULL,
	invoice_id INTEGER REFERENCES invoices(id),
	run_id INTEGER,
	detail TEXT NOT NULL,
	occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS history_by_customer ON history(customer_id);

CREATE TABLE IF NOT EXISTS scheduler_state (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	last_run_date TEXT NOT NULL
);
`

export const SCHEDULER_STATE_ROW_ID = 1

export const LIKE_SPECIAL_CHARACTERS = /[\\%_]/g

export const LIKE_ESCAPE = '\\'

export const DOCUMENT_SEPARATORS = /[\s.-]/g

export const DOCUMENT_FRAGMENT = /^[A-Z]?\d+$/

export const CUSTOMER_SEARCH_WHERE = `WHERE (? IS NOT NULL AND customers.id LIKE ? ESCAPE '${LIKE_ESCAPE}') OR UPPER(customers.name) LIKE ? ESCAPE '${LIKE_ESCAPE}'`

export const CUSTOMER_ROWS_SELECT = `
	SELECT
		customers.id,
		customers.name,
		customers.document_type,
		customers.person_kind,
		(SELECT COUNT(*) FROM contracts WHERE contracts.customer_id = customers.id) AS contracts,
		COALESCE(SUM(CASE WHEN invoices.status = 'open' THEN 1 ELSE 0 END), 0) AS open_invoices,
		COALESCE(SUM(CASE WHEN invoices.status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_invoices,
		COALESCE(SUM(CASE WHEN invoices.status = 'open' THEN invoices.balance_cents ELSE 0 END), 0) AS debt_cents,
		MIN(CASE WHEN invoices.status = 'open' THEN invoices.due_date END) AS oldest_due_date
	FROM customers
	LEFT JOIN invoices ON invoices.customer_id = customers.id`

export const CUSTOMER_ROWS_ORDER = 'GROUP BY customers.id ORDER BY debt_cents DESC, customers.name'

export const OVERVIEW_SELECT = `
	SELECT
		(SELECT COUNT(*) FROM customers) AS customers,
		(SELECT COUNT(*) FROM contracts) AS contracts,
		(SELECT COUNT(*) FROM invoices WHERE status = 'open') AS open_invoices,
		(SELECT COUNT(*) FROM invoices WHERE status = 'paid') AS paid_invoices,
		(SELECT COALESCE(SUM(balance_cents), 0) FROM invoices WHERE status = 'open') AS receivable_cents,
		(SELECT run_counters.value FROM run_counters JOIN runs ON runs.id = run_counters.run_id
			WHERE runs.kind = 'import' AND runs.status = 'completed' AND run_counters.name = 'contracts_total'
			ORDER BY runs.id DESC LIMIT 1) AS provider_contracts`
