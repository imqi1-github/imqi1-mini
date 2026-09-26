import { describe, expect, test } from "bun:test";

import type { SiteConfig } from "@/types/site-config";
import { defineSiteConfig } from "@/utils/site-config";

describe("defineSiteConfig(类型守卫透传)", () => {
  test("返回入参本身(零副作用)", () => {
    // 故意以 unknown 中转,绕开完整 SiteConfig 必填项,聚焦函数行为
    const input = { siteName: "x" } as unknown as SiteConfig;
    const cfg = defineSiteConfig(input);
    expect(cfg as unknown as Record<string, unknown>).toEqual({ siteName: "x" });
  });

  test("嵌套对象结构保留", () => {
    const input = {
      siteName: "y",
      home: {
        eyebrow: "E",
        titleLines: ["a", "b"],
        description: "d",
        primaryButton: { label: "P" },
        secondaryButton: { label: "S" },
      },
    } as unknown as SiteConfig;
    const cfg = defineSiteConfig(input);
    if (cfg.home && Array.isArray(cfg.home.titleLines)) {
      expect(cfg.home.titleLines).toEqual(["a", "b"]);
    }
  });
});
