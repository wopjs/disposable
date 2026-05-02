import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

import disposable from "../eslint-plugin.js";

const execFileAsync = promisify(execFile);
const biomeBin = resolve("node_modules/.bin", process.platform === "win32" ? "biome.cmd" : "biome");
const biomePluginPath = resolve("biome-plugin.grit");
const readonlyMessage = "Use readonly for Disposable to avoid leaks through accidental reassignment.";

async function lintWithDisposable(code: string) {
  const eslint = new ESLint({
    overrideConfig: [
      {
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
        },
        plugins: disposable.recommended.plugins,
        rules: disposable.recommended.rules,
      },
    ],
    overrideConfigFile: true,
  });

  const [result] = await eslint.lintText(code, { filePath: "fixture.js" });
  return result.messages;
}

async function runBiomeWithDisposablePlugin(code: string) {
  const dir = await mkdtemp(join(tmpdir(), "disposable-biome-plugin-"));

  try {
    const configPath = join(dir, "biome.json");
    const samplePath = join(dir, "sample.ts");
    await writeFile(
      configPath,
      JSON.stringify({
        formatter: { enabled: false },
        linter: {
          rules: {
            correctness: {
              noUnusedVariables: "off",
            },
          },
        },
        plugins: [biomePluginPath],
      }),
    );
    await writeFile(samplePath, code);

    try {
      const { stderr, stdout } = await execFileAsync(biomeBin, [
        "check",
        `--config-path=${configPath}`,
        "--colors=off",
        "--max-diagnostics=none",
        samplePath,
      ]);

      return { code: 0, output: `${stdout}${stderr}` };
    } catch (error) {
      const result = error as { code?: number | string; stderr?: string; stdout?: string };
      return {
        code: typeof result.code === "number" ? result.code : 1,
        output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
      };
    }
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

describe("ESLint plugin", () => {
  it("should expose the recommended config", () => {
    expect(disposable.recommended.plugins?.disposable).toBe(disposable.plugin);
    expect(disposable.recommended.rules?.["disposable/readonly-dispose"]).toBe("error");
  });

  it("should report non-readonly dispose class properties", async () => {
    const messages = await lintWithDisposable(`
class Example {
  dispose = disposableStore();
}
`);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      column: 3,
      line: 3,
      message: readonlyMessage,
      ruleId: "disposable/readonly-dispose",
    });
  });

  it("should ignore unrelated class properties", async () => {
    const messages = await lintWithDisposable(`
class Example {
  cleanup = disposableStore();
  dispose = createDisposer();
}
`);

    expect(messages).toHaveLength(0);
  });
});

describe("Biome plugin", () => {
  it("should report non-readonly dispose class properties", async () => {
    const result = await runBiomeWithDisposablePlugin(`
class MissingType {
  dispose: DisposableStore;
}

class MissingInitializer {
  dispose = disposableStore();
}

class MissingGeneric {
  dispose = disposableMap<string, number>();
}

class Present {
  readonly dispose = disposableStore();
}
`);

    expect(result.code).toBe(1);
    expect(Array.from(result.output.matchAll(new RegExp(readonlyMessage, "g")))).toHaveLength(3);
  });

  it("should ignore unrelated class properties", async () => {
    const result = await runBiomeWithDisposablePlugin(`
class Present {
  readonly dispose = disposableStore();
}

class Cleanup {
  cleanup = disposableStore();
}

class Other {
  dispose = createDisposer();
}
`);

    expect(result.code).toBe(0);
    expect(result.output).not.toContain(readonlyMessage);
  });
});
