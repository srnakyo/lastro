/** Which real tests check each acceptance criterion of Lastro's own requirements (file::test name, as JUnit reports them). */
const u = (file: string, name: string) => `tests/unit/${file}.test.ts::${name}`;
const i = (file: string, name: string) => `tests/integration/${file}.test.ts::${name}`;
const e = (file: string, name: string) => `tests/e2e/${file}.spec.ts::${name}`;

export const LINKS: Record<string, Record<string, string[]>> = {
  "REQ-0C4N1": {
    "AC-1": [i("cli", "creates the project and the whole .lastro/ export, then says it is already initialized without changing anything")],
    "AC-2": [i("cli", "creates the project and the whole .lastro/ export, then says it is already initialized without changing anything")],
  },
  "REQ-1F7QA": {
    "AC-1": [i("cli", "names the file, the field and the allowed values of an invalid status, and exits 1")],
    "AC-2": [u("export-schemas", "are one per export file and match the contracts"), u("export-schemas", "accept every example file of the PRD")],
  },
  "REQ-2K9DM": { "AC-1": [u("codes", "generates Crockford base32 codes that the schema accepts"), u("codes", "gives up after repeated collisions"), u("codes", "are INV-XXXXX like every other entity, and older INV-1 codes stay valid")] },
  "REQ-3M5TX": {
    "AC-1": [i("cli", "lists the missing fields by name, grouped by reason (REQ-3M5TX, REQ-7V6KE)"), u("lifecycle", "lists the required fields that are missing")],
    "AC-2": [i("requirements", "becomes specified when every required field and quote is in place")],
  },
  "REQ-4P8WB": {
    "AC-1": [u("text", "rejects a quote with one word changed and points at the closest passage")],
    "AC-2": [u("text", "finds a quote under a section anchor, ignoring emphasis, code marks and line breaks")],
    "AC-3": [u("text", "accepts a quote in the third paragraph of a section anchor and points at /p3")],
  },
  "REQ-5R2HC": {
    "AC-1": [i("cli", "approves the package's requirements except the one held by a blocking question, naming the question")],
    "AC-2": [i("decisions", "records an answer with its source as a client_answer decision and closes the question")],
  },
  "REQ-6T3JD": { "AC-1": [i("decisions", "records agent assumptions as proposed and reopens what was built on an overturned one")] },
  "REQ-7V6KE": { "AC-1": [i("cli", "lists the missing fields by name, grouped by reason (REQ-3M5TX, REQ-7V6KE)"), u("lifecycle", "pending is only what has not reached verified")] },
  "REQ-8X1MF": {
    "AC-1": [i("runs", "stores each condition's run with its env and result"), u("runner", "runs each command once per condition, with the condition's env, and reads its report")],
    "AC-2": [u("runner", "fails a condition whose setup fails, keeps its output, and still runs the other condition (REQ-8X1MF)")],
  },
  "REQ-9Z4NG": {
    "AC-1": [u("runner", "reads Vitest, Jest, Playwright, pytest and PHPUnit reports as file::test name")],
    "AC-2": [u("runner", "fails a stage with SARIF errors and keeps file, line and rule of each")],
  },
  "REQ-A2C7H": {
    "AC-1": [i("cli", "exits 1 and lists a criterion without a test under what the agent can fix (REQ-A2C7H)")],
    "AC-2": [i("runs", "holds a manual stage until a person signs it, and refuses an agent's signature")],
    "AC-3": [i("cli", "runs offline from the export with --ci and checks the locked criteria (REQ-A2C7H AC-3)")],
  },
  "REQ-B5D8J": {
    "AC-1": [i("runs", "names the stale evidence with exactly that reason"), i("verify-flow", "runs the project's command, records the evidence and makes it stale when a touched file changes")],
    "AC-2": [u("runner", "keeps the fingerprint when only files outside the touched ones change")],
  },
  "REQ-C8E1K": { "AC-1": [i("runs", "fails naming a locked test whose file changed after it was sealed, until a person unlocks"), i("cli", "runs offline from the export with --ci and checks the locked criteria (REQ-A2C7H AC-3)")] },
  "REQ-D1F4M": { "AC-1": [i("docs", "lists a package's items in the requester's order, and an item with an open question only under 'Awaiting answer' (REQ-D1F4M)")] },
  "REQ-E4G7N": {
    "AC-1": [i("cli", "refuses with exit code 2 and changes nothing when there is no terminal and no --yes"), i("cli", "accepts --yes only from a person listed in gate.human_identities")],
    "AC-2": [i("api", "lets an agent create requirements but never approve them"), i("lifecycle", "is a human command: agents can neither approve nor mark sources final"), i("api", "initializes and lists the tools without any human-only action"), u("hooks", "refuses human commands in Bash and lets the rest through")],
  },
  "REQ-F7H2Q": {
    "AC-1": [i("projects", "has a projectId on every project-scoped table, filled on rows created through nested writes"), i("projects", "reports no pending migration")],
    "AC-2": [i("projects", "never lets the audit log be edited or deleted")],
  },
  "REQ-G2J5R": {
    "AC-1": [i("cli", "fails on a literal token or database URL with credentials in lastro.yml")],
    "AC-2": [u("text", "removes the password of a connection URL, tokens and password settings from a message")],
    "AC-3": [i("api", "stores only the visible prefix and a SHA-256 hash; the token authenticates and any other value does not")],
  },
  "REQ-H5K8S": {
    "AC-1": [i("export", "writes byte-identical files when nothing changed, and this repository's .lastro/ survives import and export unchanged")],
    "AC-2": [i("export", "writes byte-identical files when nothing changed, and this repository's .lastro/ survives import and export unchanged")],
    "AC-3": [i("snapshot", "refuses a hand-made approval in an agent's import and names it; a person's import applies it")],
  },
  "REQ-J8M1T": {
    "AC-1": [e("dashboard", "signing in from a project URL returns to that URL (REQ-J8M1T)")],
    "AC-2": [e("dashboard", "the project switcher moves between projects and keeps the page")],
    "AC-3": [e("dashboard", "a project outside the person's workspaces answers as not found (REQ-J8M1T)")],
  },
  "REQ-K1P4V": { "AC-1": [u("highlight", "marks the quote inside the passage, across emphasis and line breaks"), e("spec", "a requirement shows its quote next to the source and what holds it back")] },
  "REQ-M4R7W": { "AC-1": [u("diagrams", "draws a criterion without a test as a gap labelled 'no test' (REQ-M4R7W)")] },
  "REQ-N7T0X": { "AC-1": [u("diagrams", "marks the transition to approved as blocked with the reason, and shows the counts (REQ-N7T0X)")] },
  "REQ-P0V3Y": { "AC-1": [i("docs", "starts every document with the commit and the date, and groups requirements by package (REQ-P0V3Y)")] },
  "REQ-Q3W6Z": {
    "AC-1": [i("runs", "flags a test that failed and passed on two commits when its files did not change, and not when they did")],
    "AC-2": [i("runs", "builds the test catalog with flaky and orphan tests and compares a run with the previous one"), e("quality", "the test catalog shows flaky and orphan tests and the criteria without a test")],
  },
  "REQ-R6Y9A": { "AC-1": [u("diagrams", "colors each stage and condition by its latest result (REQ-R6Y9A)")] },
  "REQ-S9A2B": { "AC-1": [i("runs", "lists the tests that started failing and those passing again in separate lists (REQ-S9A2B)")] },
};
