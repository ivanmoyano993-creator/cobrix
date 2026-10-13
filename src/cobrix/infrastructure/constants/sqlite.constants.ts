export const SETTINGS_ROW_ID = 1

export const LIST_SEPARATOR = ','

export const SQL_TRUE = 1

export const SQL_FALSE = 0

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
`
