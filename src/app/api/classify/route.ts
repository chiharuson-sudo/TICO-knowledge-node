import { NextResponse } from "next/server";
import { buildClassificationPrompt } from "@/lib/relation-classifier";
import type { Knowledge } from "@/lib/types";
import type { ClassificationResult } from "@/lib/relation-classifier";

const ANTHROPIC_VERSION = "2023-06-01";
const GEMINI_MODEL = "gemini-2.5-flash";

function parseClassificationText(text: string): ClassificationResult {
  const jsonStr = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  let json: Partial<ClassificationResult>;

  try {
    json = JSON.parse(jsonStr) as Partial<ClassificationResult>;
  } catch {
    json = extractClassificationFromBrokenJson(text);
  }

  const result: ClassificationResult = {
    hasRelation: typeof json.hasRelation === "boolean" ? json.hasRelation : false,
    type: json.type && ["前提", "因果", "対策", "波及"].includes(json.type) ? json.type : null,
    direction: json.direction && ["A_to_B", "B_to_A"].includes(json.direction) ? json.direction : null,
    reason: typeof json.reason === "string" ? json.reason.replace(/\s+/g, " ").trim().slice(0, 500) : "",
    confidence: typeof json.confidence === "number" && json.confidence >= 0 && json.confidence <= 1 ? json.confidence : 0,
  };
  return result;
}

function extractClassificationFromBrokenJson(text: string): Partial<ClassificationResult> {
  const out: Partial<ClassificationResult> = {};
  const hasRelationMatch = text.match(/"hasRelation"\s*:\s*(true|false)/i);
  if (hasRelationMatch) out.hasRelation = hasRelationMatch[1].toLowerCase() === "true";

  const typeMatch = text.match(/"type"\s*:\s*"(前提|因果|対策|波及)"/);
  if (typeMatch) out.type = typeMatch[1] as ClassificationResult["type"];

  const directionMatch = text.match(/"direction"\s*:\s*"(A_to_B|B_to_A)"/);
  if (directionMatch) out.direction = directionMatch[1] as "A_to_B" | "B_to_A";

  const reasonMatch = text.match(/"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (reasonMatch) out.reason = reasonMatch[1].replace(/\\"/g, '"').replace(/\s+/g, " ").trim().slice(0, 500);
  else {
    const reasonLoose = text.match(/"reason"\s*:\s*"([^]*?)(?:"\s*[,}]|$)/);
    if (reasonLoose) out.reason = reasonLoose[1].replace(/\\"/g, '"').replace(/\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  }

  const confidenceMatch = text.match(/"confidence"\s*:\s*([0-9.]+)/);
  if (confidenceMatch) {
    const n = parseFloat(confidenceMatch[1]);
    if (!Number.isNaN(n)) out.confidence = Math.max(0, Math.min(1, n));
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nodeA: Knowledge = body.nodeA;
    const nodeB: Knowledge = body.nodeB;
    const llmProvider = (body.llmProvider as string) || "anthropic";
    const anthropicApiKey = body.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
    const geminiApiKey = body.geminiApiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!nodeA?.id || !nodeB?.id) {
      return NextResponse.json({ error: "nodeA と nodeB が必要です" }, { status: 400 });
    }

    const prompt = buildClassificationPrompt(nodeA, nodeB);

    if (llmProvider === "gemini") {
      if (!geminiApiKey) {
        return NextResponse.json(
          { error: "Gemini API Key が必要です。画面で入力するか、GOOGLE_GENERATIVE_AI_API_KEY を設定してください。" },
          { status: 400 }
        );
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
      const options = {
        method: "POST" as const,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500 },
        }),
      };

      let res = await fetch(url, options);
      if (res.status === 429) {
        let waitMs = 22_000;
        try {
          const errBody = (await res.json()) as {
            error?: { message?: string };
            details?: { retryDelay?: string }[];
          };
          const msg = errBody.error?.message ?? "";
          const retryDetail = errBody.details?.find((d: { retryDelay?: string }) => d.retryDelay);
          if (retryDetail?.retryDelay) {
            const sec = parseFloat(retryDetail.retryDelay.replace(/s$/i, ""));
            if (!Number.isNaN(sec)) waitMs = Math.ceil(sec * 1000);
          } else {
            const msgMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
            if (msgMatch) {
              const sec = parseFloat(msgMatch[1]);
              if (!Number.isNaN(sec)) waitMs = Math.ceil(sec * 1000);
            }
          }
        } catch {
          /* use default 22s */
        }
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 60_000)));
        res = await fetch(url, options);
      }
      if (!res.ok) {
        const err = await res.text();
        const is429 = res.status === 429;
        return NextResponse.json(
          {
            error: is429
              ? "Geminiの無料枠（1分あたり5リクエスト）を超えました。最大ペア数を減らすか、1分ほど待ってから再分析してください。"
              : `Gemini API エラー: ${res.status} ${err}`,
          },
          { status: 502 }
        );
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const json = parseClassificationText(text);
      return NextResponse.json(json);
    }

    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: "Anthropic API Key が必要です。画面で入力するか、ANTHROPIC_API_KEY を設定してください。" },
        { status: 400 }
      );
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
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
    const json = parseClassificationText(text);
    return NextResponse.json(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
