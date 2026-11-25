import { agentEventsService } from "@lastro/core";

/** Two agent sessions as the Claude Code hooks and the MCP server would record them. */
export async function seedAgentSessions(projectId: string) {
  const a = { agent: "claude-code", externalId: "demo-session-checkout" };
  const events: [string, object][] = [
    ["session.start", { source: "startup" }],
    ["lastro_context", { arguments: {} }],
    ["lastro_get_requirement", { arguments: { code: "REQ-PAY01" } }],
    ["lastro_start", { arguments: { code: "REQ-PAY01", branch: "feat/checkout" } }],
    ["file.edit", { file: "src/checkout/payment-step.tsx", tool: "Edit" }],
    ["file.edit", { file: "src/checkout/total.ts", tool: "Write" }],
    ["tool.denied", { tool: "Edit", reason: "tests/e2e/checkout.spec.ts holds tests of locked criteria (REQ-PAY01 AC-2). Fix the code, not the test." }],
    ["lastro_verify", { arguments: { code: "REQ-PAY01" } }],
    ["stop.blocked", { reason: "Lastro gate is red for requirements you are building:\n- REQ-PAY01: e2e · mobile failed" }],
    ["file.edit", { file: "src/checkout/payment-step.tsx", tool: "Edit" }],
    ["lastro_record_decision", { arguments: { kind: "assumption", text: "The total sticks to the bottom of the screen on phones." } }],
    ["lastro_pause", { arguments: { reason: "Waiting for the client to confirm the sticky total on phones" } }],
    ["session.stop", { note: "paused: Waiting for the client to confirm the sticky total on phones" }],
  ];
  for (const [kind, payload] of events) await agentEventsService.record(projectId, a, kind, payload as never);
  const b = { agent: "claude-code", externalId: "demo-session-coupon" };
  for (const [kind, payload] of [
    ["session.start", { source: "compact" }],
    ["lastro_context", { arguments: {} }],
    ["file.edit", { file: "src/coupon/apply.ts", tool: "Edit" }],
    ["lastro_verify", { arguments: { code: "REQ-CPN01" } }],
    ["lastro_submit", { arguments: { code: "REQ-CPN01" } }],
    ["session.stop", {}],
  ] as [string, object][]) await agentEventsService.record(projectId, b, kind, payload as never);
}
