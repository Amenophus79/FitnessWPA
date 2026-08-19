import { execFileSync } from "node:child_process";
import { spawn } from "node:child_process";

// Supervisor may create /data as root. Repair both supported data locations
// before dropping to the unprivileged application user.
execFileSync("chown", ["-R", "node:node", "/data", "/app/data"], { stdio: "inherit" });

process.setgid("node");
process.setuid("node");

const child = spawn("npm", ["run", "start"], { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
