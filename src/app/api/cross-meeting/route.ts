import { NextResponse } from "next/server";
import { findCrossMeetingPairs } from "@/lib/cross-meeting";
import type { Knowledge, Relation } from "@/lib/types";
import type { EmbeddingResult } from "@/lib/embedding";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nodes: Knowledge[] = body.nodes ?? [];
    const embeddings: EmbeddingResult[] = body.embeddings ?? [];
    const relations: Relation[] = body.relations ?? [];
    const threshold = typeof body.threshold === "number" ? body.threshold : 0.72;

    if (nodes.length === 0 || embeddings.length === 0) {
      return NextResponse.json(
        { error: "nodes と embeddings が必要です" },
        { status: 400 }
      );
    }

    const pairs = findCrossMeetingPairs(nodes, embeddings, relations, threshold);
    return NextResponse.json({ pairs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
