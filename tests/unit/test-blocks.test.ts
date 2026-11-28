import { describe, expect, it } from "bun:test";
import { blockOf, declaredName } from "../../packages/runner/src/test-blocks";

const GO = `package reserva

import (
	"testing"
)

func TestA_REQ49C1W_AC5(t *testing.T) {
	if x := "}"; x != "}" {
		t.Fatal("a")
	}
}

func TestB(t *testing.T) {
	t.Log("b")
}
`;

describe("a test's own lines", () => {
  it("takes a Go test from its func to its closing brace, ignoring braces in strings", () => {
    expect(blockOf(GO, "x_test.go", "TestA_REQ49C1W_AC5")).toEqual(["func TestA_REQ49C1W_AC5(t *testing.T) {", '\tif x := "}"; x != "}" {', '\t\tt.Fatal("a")', "\t}", "}"]);
    expect(blockOf(GO, "x_test.go", "TestB")).toEqual(["func TestB(t *testing.T) {", '\tt.Log("b")', "}"]);
  });

  it("takes a Bun or Playwright test by its name, and a Python test by its indentation", () => {
    const ts = 'describe("x", () => {\n  it("shows the 8% line for 60 seats", () => {\n    expect(1).toBe(1);\n  });\n});\n';
    expect(blockOf(ts, "a.test.ts", "shows the 8% line for 60 seats")).toEqual(['  it("shows the 8% line for 60 seats", () => {', "    expect(1).toBe(1);", "  });"]);
    const py = "def test_a():\n    assert 1\n\ndef test_b():\n    assert 2\n";
    expect(blockOf(py, "test_x.py", "test_a")).toEqual(["def test_a():", "    assert 1", ""]);
  });

  it("names the declared test from a JUnit ref, and finds nothing for an unknown one", () => {
    expect(declaredName("x_test.go::TestA/subcase")).toBe("TestA");
    expect(declaredName("a.test.ts::describe > it works")).toBe("it works");
    expect(blockOf(GO, "x_test.go", "TestMissing")).toBeNull();
  });
});
