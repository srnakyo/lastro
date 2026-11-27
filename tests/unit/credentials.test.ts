import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentServer, readCredentials, saveLogin } from "../../packages/cli/src/config/credentials";
import { browserCommand } from "../../packages/cli/src/login/open-browser";

const SERVER = "http://localhost:4317";
const saved = { ...process.env };
let home = "";

/** A repository linked to a project, as `lastro init` leaves it. */
function repo(project: string) {
  const dir = mkdtempSync(join(tmpdir(), "lastro-repo-"));
  mkdirSync(join(dir, ".lastro"));
  writeFileSync(join(dir, ".lastro", "lastro.yml"), `version: 1\nproject: ${project}\nserver:\n  project: ${project}\n`);
  return dir;
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "lastro-home-"));
  process.env.XDG_CONFIG_HOME = home;
  delete process.env.LASTRO_URL;
  delete process.env.LASTRO_TOKEN;
});

afterEach(() => {
  process.env = { ...saved };
});

describe("the logins the CLI keeps", () => {
  it("uses the token for every project in any repository, and a project's own token in that project's repository", () => {
    saveLogin(`${SERVER}/`, "lst_all_workspace");
    saveLogin(SERVER, "lst_shop_only", "shop");
    expect(readCredentials(repo("shop"))).toEqual({ url: SERVER, token: "lst_shop_only" });
    expect(readCredentials(repo("billing"))).toEqual({ url: SERVER, token: "lst_all_workspace" });
    expect(readCredentials(home)).toEqual({ url: SERVER, token: "lst_all_workspace" });
    expect(currentServer()).toBe(SERVER);
  });

  it("keeps the logins of 2 servers and uses the last one, unless LASTRO_URL names the other", () => {
    saveLogin("https://lastro.example.com", "lst_remote");
    saveLogin(SERVER, "lst_local");
    expect(readCredentials(home)?.token).toBe("lst_local");
    process.env.LASTRO_URL = "https://lastro.example.com/";
    expect(readCredentials(home)).toEqual({ url: "https://lastro.example.com", token: "lst_remote" });
  });

  it("lets LASTRO_URL and LASTRO_TOKEN win over what is stored, as in CI", () => {
    saveLogin(SERVER, "lst_local");
    process.env.LASTRO_URL = "https://ci.example.com";
    process.env.LASTRO_TOKEN = "lst_ci";
    expect(readCredentials(home)).toEqual({ url: "https://ci.example.com", token: "lst_ci" });
  });

  it("reads the single login that version 0.1.0 stored, and keeps it when a project login is added", () => {
    mkdirSync(join(home, "lastro"));
    writeFileSync(join(home, "lastro", "credentials.json"), JSON.stringify({ url: `${SERVER}/`, token: "lst_old" }));
    expect(readCredentials(home)).toEqual({ url: SERVER, token: "lst_old" });
    saveLogin(SERVER, "lst_shop_only", "shop");
    expect(JSON.parse(readFileSync(join(home, "lastro", "credentials.json"), "utf8"))).toEqual({ current: SERVER, servers: { [SERVER]: { token: "lst_old", projects: { shop: "lst_shop_only" } } } });
  });

  it("has nothing to give before any login, or for a project-only login outside its repository", () => {
    expect(readCredentials(home)).toBeNull();
    saveLogin(SERVER, "lst_shop_only", "shop");
    expect(readCredentials(repo("billing"))).toBeNull();
  });
});

describe("opening the authorization page", () => {
  const url = "http://localhost:4317/cli/authorize/0199";
  it("uses the system's opener, and the Windows browser under WSL", () => {
    expect(browserCommand(url, "darwin", {}, "24.0.0")).toEqual(["open", [url]]);
    expect(browserCommand(url, "win32", {}, "10.0")).toEqual(["cmd", ["/c", "start", "", url]]);
    expect(browserCommand(url, "linux", {}, "6.6.87.2-microsoft-standard-WSL2")).toEqual(["cmd.exe", ["/c", "start", "", url]]);
    expect(browserCommand(url, "linux", { WSL_DISTRO_NAME: "Ubuntu" }, "6.6.0")).toEqual(["cmd.exe", ["/c", "start", "", url]]);
    expect(browserCommand(url, "linux", {}, "6.8.0-45-generic")).toEqual(["xdg-open", [url]]);
  });
});
