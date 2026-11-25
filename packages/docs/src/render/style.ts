/** Print-friendly styles with the dashboard's palette (blue primary, slate text, Inter and JetBrains Mono). */
export const DOC_CSS = `
:root { --fg:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#ffffff; --soft:#f4f6fa; --primary:#1d63d8; --ok:#16a34a; --bad:#e11d48; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.6 "Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif; }
main { max-width: 920px; margin: 0 auto; padding: 48px 40px 64px; }
.brand { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12px; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 28px; }
.brand b { color: var(--primary); font-size: 13px; letter-spacing: 0; text-transform: none; }
.brand i { width: 22px; height: 22px; border-radius: 6px; background: var(--primary); display: inline-block; }
h1 { font-size: 28px; line-height: 1.2; margin: 0 0 6px; letter-spacing: -.01em; }
h1 + p em { color: var(--muted); font-style: normal; font-size: 12.5px; }
h2 { font-size: 19px; margin: 36px 0 10px; padding-top: 14px; border-top: 1px solid var(--line); }
h3 { font-size: 14.5px; margin: 22px 0 6px; }
p, ul { margin: 8px 0; }
a { color: var(--primary); }
code { font: 12.5px "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace; background: var(--soft); padding: 1px 5px; border-radius: 4px; }
blockquote { margin: 10px 0; padding: 8px 14px; border-left: 3px solid var(--primary); background: #1d63d80d; border-radius: 0 6px 6px 0; }
table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; font-size: 12.5px; page-break-inside: auto; }
th { text-align: left; font-weight: 600; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--line); padding: 7px 8px; }
td { border-bottom: 1px solid var(--line); padding: 7px 8px; vertical-align: top; }
tr { page-break-inside: avoid; }
pre.mermaid, div.mermaid { background: var(--soft); border-radius: 8px; padding: 16px; text-align: center; overflow-x: auto; page-break-inside: avoid; }
div.mermaid svg { max-width: 100%; height: auto; }
@media print { main { padding: 0; } h2 { page-break-after: avoid; } }
`;
