import { spawn } from "node:child_process";
import { release } from "node:os";

/** The command that opens a URL in the person's browser, on this system. WSL opens the Windows browser. */
export function browserCommand(url: string, platform = process.platform, env = process.env, kernel = release()): [string, string[]] {
  if (platform === "darwin") return ["open", [url]];
  if (platform === "win32") return ["cmd", ["/c", "start", "", url]];
  if (env.WSL_DISTRO_NAME || /microsoft/i.test(kernel)) return ["cmd.exe", ["/c", "start", "", url]];
  return ["xdg-open", [url]];
}

/** Tries to open the URL; the URL is printed anyway, so a missing browser only means opening it by hand. */
export function openBrowser(url: string) {
  const [command, args] = browserCommand(url);
  try {
    const child = spawn(command, args, { detached: true, stdio: "ignore", cwd: process.platform === "win32" ? undefined : "/" });
    child.on("error", () => undefined);
    child.unref();
  } catch {
    // No browser here: the person opens the printed URL.
  }
}
