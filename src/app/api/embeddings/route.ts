import { NextResponse } from "next/server";
import { buildEmbeddingText } from "@/lib/embedding";
import type { Knowledge } from "@/lib/types";

const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nodes: Knowledge[] = body.nodes ?? [];
    const apiKey = body.openaiApiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API Key が必要です。画面で入力するか、OPENAI_API_KEY を設定してください。" },
        { status: 400 }
      );
    }
    if (nodes.length === 0) {
      return NextResponse.json({ error: "ナレッジがありません" }, { status: 400 });
    }

    const results: { id: string; embedding: number[] }[] = [];

    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE);
      const texts = batch.map((n) => buildEmbeddingText(n));
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
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
