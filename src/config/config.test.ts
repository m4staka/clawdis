import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

describe("config identity defaults", () => {
  async function withTempConfig<T>(
    config: unknown,
    fn: (configPath: string) => Promise<T>,
  ): Promise<T> {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "clawdis-config-"));
    const configPath = path.join(base, "clawdis.json");
    try {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
      return await fn(configPath);
    } finally {
      await fs.rm(base, { recursive: true, force: true });
    }
  }

  it("derives responsePrefix and mentionPatterns when identity is set", async () => {
    await withTempConfig(
      {
        identity: { name: "Samantha", theme: "helpful sloth", emoji: "🦥" },
        inbound: {},
      },
      async (configPath) => {
        vi.resetModules();
        const { loadConfig } = await import("./config.js");
        const cfg = loadConfig({ path: configPath });

        expect(cfg.inbound?.responsePrefix).toBe("🦥");
        expect(cfg.inbound?.groupChat?.mentionPatterns).toEqual([
          "\\b@?Samantha\\b",
        ]);
      },
    );
  });

  it("does not override explicit values", async () => {
    await withTempConfig(
      {
        identity: {
          name: "Samantha Sloth",
          theme: "space lobster",
          emoji: "🦞",
        },
        inbound: {
          responsePrefix: "✅",
          groupChat: { mentionPatterns: ["@clawd"] },
        },
      },
      async (configPath) => {
        vi.resetModules();
        const { loadConfig } = await import("./config.js");
        const cfg = loadConfig({ path: configPath });

        expect(cfg.inbound?.responsePrefix).toBe("✅");
        expect(cfg.inbound?.groupChat?.mentionPatterns).toEqual(["@clawd"]);
      },
    );
  });

  it("does not synthesize inbound.agent/session when absent", async () => {
    await withTempConfig(
      {
        identity: { name: "Samantha", theme: "helpful sloth", emoji: "🦥" },
        inbound: {},
      },
      async (configPath) => {
        vi.resetModules();
        const { loadConfig } = await import("./config.js");
        const cfg = loadConfig({ path: configPath });

        expect(cfg.inbound?.responsePrefix).toBe("🦥");
        expect(cfg.inbound?.groupChat?.mentionPatterns).toEqual([
          "\\b@?Samantha\\b",
        ]);
        expect(cfg.inbound?.agent).toBeUndefined();
        expect(cfg.inbound?.session).toBeUndefined();
      },
    );
  });

  it("loads inbound.agent proxy overrides when present", async () => {
    await withTempConfig(
      {
        inbound: {
          agent: {
            provider: "anthropic",
            model: "claude-opus-4-5",
            baseUrl: "https://proxy.example.com",
            apiKeyEnv: "MY_PROXY_TOKEN",
          },
        },
      },
      async (configPath) => {
        vi.resetModules();
        const { loadConfig } = await import("./config.js");
        const cfg = loadConfig({ path: configPath });

        expect(cfg.inbound?.agent?.baseUrl).toBe("https://proxy.example.com");
        expect(cfg.inbound?.agent?.apiKeyEnv).toBe("MY_PROXY_TOKEN");
      },
    );
  });
});
