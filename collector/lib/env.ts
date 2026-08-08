/**
 * @file collector/lib/env.ts
 * @description Windows only: fills gaps in `process.env` from the persisted
 * user and machine environment.
 *
 * Windows hands a process its environment at launch and never updates it. Set a
 * variable with `setx` or the System Properties dialog and every already-running
 * process — including your editor, and so every terminal it spawns — keeps the
 * old environment until it restarts. The variable is plainly there in the
 * settings UI while the script insists it is missing, which is a genuinely
 * confusing few minutes.
 *
 * Reading the registry directly sidesteps that: it is the same store the
 * settings dialog writes to, so a value is visible the moment it is saved.
 *
 * Values already in `process.env` always win, so a shell-local override
 * (`$env:STEAM_ID = "..."`) still behaves as expected, and CI — where this is a
 * no-op anyway — is unaffected.
 */

import { execFileSync } from "node:child_process";

/** Where Windows persists each scope. User settings shadow machine ones. */
const SCOPES = [
  "HKCU\\Environment",
  "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment",
];

/**
 * `reg query` prints one indented row per value:
 *
 *     STEAM_API_KEY    REG_SZ    abc123
 *
 * Values may contain spaces, so only the name and type are delimited.
 */
const ROW = /^\s+(\S+)\s+(REG_SZ|REG_EXPAND_SZ)\s+(.*)$/;

const readScope = (scope: string): Map<string, string> => {
  const values = new Map<string, string>();
  let output: string;
  try {
    output = execFileSync("reg", ["query", scope], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    // Missing key or no permission to read it. Machine scope is readable by
    // standard users, but there is no reason to fail the run if it is not.
    return values;
  }

  for (const line of output.split(/\r?\n/)) {
    const match = ROW.exec(line);
    if (match?.[1] && match[3]) {
      values.set(match[1], match[3].trim());
    }
  }
  return values;
};

/**
 * Populates any of `names` missing from the current environment. Returns the
 * names that were recovered this way, so the caller can explain itself.
 */
export const hydrateFromWindowsEnvironment = (names: string[]): string[] => {
  if (process.platform !== "win32") {
    return [];
  }

  const wanted = names.filter((name) => !process.env[name]);
  if (wanted.length === 0) {
    return [];
  }

  const recovered: string[] = [];
  // Machine scope first so user scope overwrites it, matching how Windows
  // composes a new process's environment.
  for (const scope of [...SCOPES].reverse()) {
    const values = readScope(scope);
    for (const name of wanted) {
      const value = values.get(name);
      if (value) {
        process.env[name] = value;
        if (!recovered.includes(name)) {
          recovered.push(name);
        }
      }
    }
  }
  return recovered;
};
