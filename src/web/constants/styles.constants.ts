export const CSS = `
:root {
	--bg: #f5f6f8; --surface: #fff; --sunken: #eef0f3; --fg: #18202b; --muted: #5f6b7a; --line: #dde1e7;
	--primary: #3b4cca; --primary-soft: #e8ebfb; --primary-fg: #fff;
	--ok: #17703f; --ok-bg: #def3e6; --warn: #8a5300; --warn-bg: #fbedd3; --bad: #b42318; --bad-bg: #fbe1de;
	--info: #2b5aa8; --info-bg: #e0eafa; --mute: #5f6b7a; --mute-bg: #eceff3;
	--font: "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
	--mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
	color-scheme: light;
}
@media (prefers-color-scheme: dark) { :root {
	--bg: #0f131a; --surface: #161b24; --sunken: #1c2230; --fg: #e5e9f0; --muted: #98a3b3; --line: #2a3242;
	--primary: #8d9bff; --primary-soft: #232a4d; --primary-fg: #0f131a;
	--ok: #6fd69a; --ok-bg: #173826; --warn: #f1c26b; --warn-bg: #3a2c12; --bad: #f59a90; --bad-bg: #42201c;
	--info: #9cbcf5; --info-bg: #1c2b47; --mute: #98a3b3; --mute-bg: #232a36;
	color-scheme: dark;
} }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.5 var(--font); }
a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }
.shell { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: 100vh; }
.side { background: var(--surface); border-right: 1px solid var(--line); padding: 18px 12px; display: flex; flex-direction: column; gap: 18px; position: sticky; top: 0; height: 100vh; }
.brand { display: flex; gap: 10px; align-items: center; padding: 0 6px; }
.brand small { display: block; color: var(--muted); font-size: 12px; }
.mark { width: 32px; height: 32px; border-radius: 8px; background: var(--primary); color: var(--primary-fg); display: grid; place-items: center; font-weight: 700; }
.side nav { display: grid; gap: 2px; }
.side nav a { color: var(--fg); padding: 8px 10px; border-radius: 6px; font-weight: 500; }
.side nav a:hover { background: var(--sunken); text-decoration: none; }
.side nav a[aria-current="page"] { background: var(--primary-soft); color: var(--primary); }
.side-foot { margin-top: auto; color: var(--muted); font-size: 12px; padding: 0 6px; }
.main { padding: 24px 28px 60px; min-width: 0; display: grid; gap: 20px; align-content: start; max-width: 1280px; }
h1 { font-size: 22px; margin: 0; }
h2 { font-size: 16px; margin: 0; }
.head { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; justify-content: space-between; }
.head p { margin: 4px 0 0; color: var(--muted); max-width: 80ch; }
.back { font-size: 13px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; min-width: 0; }
.card > header { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.card > header p { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.card > .body { padding: 16px; display: grid; gap: 14px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.tile { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; display: grid; gap: 2px; }
.tile span { color: var(--muted); font-size: 12px; }
.tile strong { font-size: 20px; font-variant-numeric: tabular-nums; }
.tile small { color: var(--muted); font-size: 12px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 12px; color: var(--muted); font-weight: 600; background: var(--sunken); white-space: nowrap; }
tr:last-child td { border-bottom: 0; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.nowrap { white-space: nowrap; }
.mono { font-family: var(--mono); font-size: 12.5px; white-space: nowrap; }
.muted { color: var(--muted); }
.pill { display: inline-block; padding: 1px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.pill.ok { color: var(--ok); background: var(--ok-bg); } .pill.warn { color: var(--warn); background: var(--warn-bg); }
.pill.bad { color: var(--bad); background: var(--bad-bg); } .pill.info { color: var(--info); background: var(--info-bg); }
.pill.mute { color: var(--mute); background: var(--mute-bg); }
.flash { padding: 10px 14px; border-radius: 8px; font-weight: 500; }
.flash.ok { background: var(--ok-bg); color: var(--ok); } .flash.bad { background: var(--bad-bg); color: var(--bad); }
.flash.info { background: var(--info-bg); color: var(--info); } .flash.warn { background: var(--warn-bg); color: var(--warn); }
.flash.mute { background: var(--mute-bg); color: var(--mute); }
.alert { border-left: 4px solid var(--bad); background: var(--bad-bg); color: var(--bad); padding: 12px 14px; border-radius: 8px; display: grid; gap: 4px; }
.btn { font: 600 13.5px var(--font); border: 1px solid var(--line); background: var(--surface); color: var(--fg); padding: 7px 14px; border-radius: 7px; cursor: pointer; }
.btn:hover { background: var(--sunken); }
.btn:disabled { opacity: .6; cursor: progress; }
.btn.primary { background: var(--primary); border-color: var(--primary); color: var(--primary-fg); }
.btn.small { padding: 3px 10px; font-size: 12.5px; }
.btn:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
form.inline { display: inline; }
.grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px 18px; }
dl.facts { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 16px; margin: 0; }
dl.facts dt { color: var(--muted); }
dl.facts dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
label.field { display: grid; gap: 5px; font-weight: 600; font-size: 13px; }
label.field small { font-weight: 400; color: var(--muted); }
input[type=text], input[type=password], input[type=number], input[type=search], input[type=url], input[type=email], input[type=time], select {
	font: 14px var(--font); padding: 7px 10px; border: 1px solid var(--line); border-radius: 7px; background: var(--surface); color: var(--fg); width: 100%; }
fieldset { border: 1px solid var(--line); border-radius: 8px; padding: 10px 14px; margin: 0; display: flex; flex-wrap: wrap; gap: 6px 16px; }
fieldset legend { font-weight: 600; font-size: 13px; padding: 0 4px; }
fieldset label { display: inline-flex; gap: 6px; align-items: center; font-size: 13.5px; }
form.settings { display: grid; gap: 16px; }
.field.invalid input, .field.invalid select, fieldset.invalid { border-color: var(--bad); }
small.error { color: var(--bad); font-weight: 600; }
.fieldset-note { flex-basis: 100%; }
.fieldset-note small { color: var(--muted); font-weight: 400; }
.toggle { display: flex; gap: 10px; align-items: flex-start; }
.toggle input { margin-top: 3px; }
.toggle small { display: block; color: var(--muted); }
.sticky-actions { position: sticky; bottom: 0; background: var(--bg); padding: 12px 0; border-top: 1px solid var(--line); }
.search { display: flex; gap: 8px; max-width: 460px; width: 100%; }
.timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.timeline li { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 10px; }
.timeline time { color: var(--muted); font-size: 12.5px; }
.timeline p { margin: 2px 0 0; color: var(--muted); }
.sub { display: block; font-size: 12px; color: var(--muted); }
.overdue { display: block; font-size: 12px; color: var(--muted); }
.overdue.late { color: var(--bad); font-weight: 600; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips a { border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; font-size: 12.5px; color: var(--fg); background: var(--surface); }
.chips a[aria-current="true"] { border-color: var(--primary); background: var(--primary-soft); color: var(--primary); }
.empty { display: grid; gap: 6px; justify-items: start; padding: 22px 16px; color: var(--muted); }
.empty strong { color: var(--fg); font-size: 15px; }
.empty p { margin: 0; max-width: 70ch; }
.action-block { display: grid; gap: 6px; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
.action-block:last-child { padding-bottom: 0; border-bottom: 0; }
.action-block p { margin: 0 0 4px; color: var(--muted); font-size: 13px; }
.progress-card { border-color: var(--info); }
.progress-card progress { width: 100%; height: 10px; accent-color: var(--primary); }
.progress-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; font-variant-numeric: tabular-nums; }
.note { background: var(--sunken); border-radius: 8px; padding: 10px 14px; color: var(--muted); font-size: 13px; }
ul.todo, ol.todo { margin: 0; padding-left: 20px; display: grid; gap: 6px; max-width: 90ch; }
pre.doc { margin: 0; white-space: pre-wrap; font: 13.5px/1.6 var(--mono); color: var(--fg); max-width: 110ch; }
dialog { border: 1px solid var(--line); border-radius: 12px; padding: 0; background: var(--surface); color: var(--fg); max-width: min(460px, calc(100vw - 32px)); }
dialog::backdrop { background: rgb(15 19 26 / 45%); }
dialog form { padding: 18px; display: grid; gap: 12px; }
dialog p { margin: 0; color: var(--muted); }
@media (max-width: 860px) {
	.shell { grid-template-columns: minmax(0, 1fr); }
	.side { position: static; height: auto; flex-direction: row; flex-wrap: wrap; align-items: center; }
	.side nav { display: flex; flex-wrap: wrap; }
	.side-foot { display: none; }
	.main { padding: 16px; }
	dl.facts { grid-template-columns: minmax(0, 1fr); gap: 0 0; }
	dl.facts dd { margin-bottom: 8px; }
	.timeline li { grid-template-columns: minmax(0, 1fr); gap: 2px; }
}
@media (max-width: 640px) {
	.wide-only { display: none; }
}
`
