import { NextResponse } from "next/server";
import { buildEmbeddingText } from "@/lib/embedding";
import type { Knowledge } from "@/lib/types";

const OPENAI_MODEL = "text-embedding-3-small";
const OPENAI_BATCH_SIZE = 100;
const GEMINI_EMBED_MODEL = "gemini-embedding-001";
const GEMINI_CONCURRENCY = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nodes: Knowledge[] = body.nodes ?? [];
    const provider = (body.embeddingProvider as string) || "openai";
    const openaiKey = body.openaiApiKey ?? process.env.OPENAI_API_KEY;
    const geminiKey = body.geminiApiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (nodes.length === 0) {
      return NextResponse.json({ error: "ナレッジがありません" }, { status: 400 });
    }

    const results: { id: string; embedding: number[] }[] = [];

    if (provider === "gemini") {
      if (!geminiKey) {
        return NextResponse.json(
          { error: "Gemini API Key が必要です。画面で入力するか、GOOGLE_GENERATIVE_AI_API_KEY を設定してください。" },
          { status: 400 }
        );
      }
      const texts = nodes.map((n) => buildEmbeddingText(n));
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${encodeURIComponent(geminiKey)}`;
      for (let i = 0; i < texts.length; i += GEMINI_CONCURRENCY) {
        const chunk = texts.slice(i, i + GEMINI_CONCURRENCY);
        const promises = chunk.map((text, j) =>
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: { parts: [{ text }] },
            }),
          }).then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
            const data = (await res.json()) as { embedding?: { values?: number[] }; embeddings?: { values?: number[] }[] };
            const vec = data.embedding?.values ?? data.embeddings?.[0]?.values;
            return vec ?? [];
          })
        );
        const embeddings = await Promise.all(promises);
        for (let j = 0; j < embeddings.length; j++) {
          results.push({ id: nodes[i + j].id, embedding: embeddings[j] });
        }
      }
      return NextResponse.json({ embeddings: results });
    }

    if (!openaiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key が必要です。画面で入力するか、OPENAI_API_KEY を設定してください。" },
        { status: 400 }
      );
    }
    for (let i = 0; i < nodes.length; i += OPENAI_BATCH_SIZE) {
      const batch = nodes.slice(i, i + OPENAI_BATCH_SIZE);
      const texts = batch.map((n) => buildEmbeddingText(n));
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({ model: OPENAI_MODEL, input: texts }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: `OpenAI API エラー: ${res.status} ${err}` },
          { status: 502 }
        );
      }
      const data = (await res.json()) as { data: { embedding: number[] }[] };
      data.data.forEach((item, j) => {
        results.push({ id: batch[j].id, embedding: item.embedding });
      });
    }

    return NextResponse.json({ embeddings: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
