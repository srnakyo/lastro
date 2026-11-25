import { describe, expect, it } from "bun:test";
import { lifecycleDiagram, qaFlowDiagram, traceabilityDiagram, values } from "@lastro/docs";
import { projectConfigSchema } from "@lastro/shared";
import { errorText } from "../../apps/web/src/lib/error-text";

describe("stored codes in the reader's language", () => {
  it("puts statuses, actors and lifecycle reasons in words, and keeps unknown codes as stored", () => {
    const pt = values("pt-BR");
    expect(pt.of("status", "building")).toBe("em implementação");
    expect(pt.of("actor", "agent")).toBe("agente");
    expect(pt.reason("spec complete")).toBe("especificação completa");
    expect(pt.reason("run 01a2")).toBe("execução 01a2");
    expect(pt.reason("branch feat/x")).toBe("branch feat/x");
    expect(pt.of("status", "something_new")).toBe("something_new");
    expect(values("en").reason("incident INC-1")).toBe("incident INC-1");
  });

  it("draws the diagrams in Portuguese when asked", () => {
    const config = projectConfigSchema.parse({ project: "demo", types: { ui: { flow: ["unit"] } } });
    const flow = qaFlowDiagram(config, "ui", undefined, "pt-BR");
    expect(flow).toContain("aprovado");
    expect(flow).toContain("verificado");
    expect(flow).not.toContain('"approved"');
    const life = lifecycleDiagram([{ from: "captured", to: "specified", actors: ["system"] }], { captured: 2 }, { "captured>specified": ["open_question"] }, "pt-BR");
    expect(life).toContain("capturado (2)");
    expect(life).toContain("travado: pergunta em aberto");
    const trace = traceabilityDiagram([{ code: "REQ-1", title: "T", citations: [], criteria: [{ code: "AC-1", tests: [] }] }], {}, "pt-BR");
    expect(trace).toContain("AC-1 · sem teste");
  });
});

describe("server errors on a Portuguese screen", () => {
  it("rewrites the errors a person meets and leaves English and unknown messages alone", () => {
    expect(errorText("pt-BR", "REQ-K7Q2M cannot be approved yet")).toBe("REQ-K7Q2M ainda não pode ser aprovado: veja na página dele o que falta.");
    expect(errorText("pt-BR", "REQ-1: building → accepted is not allowed for agent")).toBe("REQ-1: de em implementação para aceito não é permitido para agente.");
    expect(errorText("pt-BR", "dropping needs a reason")).toBe("Descartar precisa de um motivo.");
    expect(errorText("en", "dropping needs a reason")).toBe("dropping needs a reason");
    expect(errorText("pt-BR", "something nobody planned")).toBe("something nobody planned");
  });
});
