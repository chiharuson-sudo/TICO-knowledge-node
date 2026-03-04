import { NextResponse } from "next/server";
import { buildClassificationPrompt } from "@/lib/relation-classifier";
import type { Knowledge } from "@/lib/types";
import type { ClassificationResult } from "@/lib/relation-classifier";

const ANTHROPIC_VERSION = "2023-06-01";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nodeA: Knowledge = body.nodeA;
    const nodeB: Knowledge = body.nodeB;
    const apiKey = body.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API Key が必要です。画面で入力するか、ANTHROPIC_API_KEY を設定してください。" },
        { status: 400 }
      );
    }
    if (!nodeA?.id || !nodeB?.id) {
      return NextResponse.json({ error: "nodeA と nodeB が必要です" }, { status: 400 });
    }

    const prompt = buildClassificationPrompt(nodeA, nodeB);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Anthropic API エラー: ${res.status} ${err}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { content: { text: string }[] };
    const text = data.content[0]?.text ?? "";
    const jsonStr = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const json = JSON.parse(jsonStr) as ClassificationResult;

    if (typeof json.hasRelation !== "boolean") json.hasRelation = false;
    if (typeof json.confidence !== "number") json.confidence = 0;
    if (!json.reason) json.reason = "";

    return NextResponse.json(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
