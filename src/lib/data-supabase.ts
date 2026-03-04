"use client";

import { supabase } from "./supabase";
import type { Knowledge, Relation } from "./types";

const KNOWLEDGE_TABLE = "knowledge";
const RELATIONS_TABLE = "relations";

/** DBの行 → Knowledge */
function rowToKnowledge(row: Record<string, unknown>): Knowledge {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    titleKey: row.title_key != null ? String(row.title_key) : undefined,
    viewpoint: String(row.viewpoint ?? ""),
    content: String(row.content ?? ""),
    product: String(row.product ?? "共通"),
    timeline: String(row.timeline ?? "共通"),
    client: String(row.client ?? "共通"),
    flow: String(row.flow ?? "共通"),
    domain: String(row.domain ?? ""),
    source: String(row.source ?? ""),
  };
}

/** Knowledge → DB用オブジェクト */
function knowledgeToRow(k: Knowledge): Record<string, unknown> {
  return {
    id: k.id,
    title: k.title,
    title_key: k.titleKey ?? null,
    viewpoint: k.viewpoint,
    content: k.content,
    product: k.product,
    timeline: k.timeline,
    client: k.client,
    flow: k.flow,
    domain: k.domain,
    source: k.source,
  };
}

/**
 * ナレッジ一覧を取得（Supabase 未設定の場合は null）
 */
export async function fetchKnowledgeFromSupabase(): Promise<Knowledge[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(KNOWLEDGE_TABLE)
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    console.error("fetchKnowledge error:", error);
    return null;
  }
  return (data ?? []).map((row) => rowToKnowledge(row as Record<string, unknown>));
}

/**
 * 関係一覧を取得（Supabase 未設定の場合は null）
 */
export async function fetchRelationsFromSupabase(): Promise<Relation[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(RELATIONS_TABLE).select("from_id, to_id, type, description");
  if (error) {
    console.error("fetchRelations error:", error);
    return null;
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    from: String(row.from_id ?? ""),
    to: String(row.to_id ?? ""),
    type: String(row.type ?? "前提") as Relation["type"],
    description: String(row.description ?? ""),
  }));
}

/**
 * 全ナレッジ・関係を差し替え（取込データを全員に反映）
 */
export async function replaceAllKnowledgeAndRelations(
  nodes: Knowledge[],
  edges: Relation[]
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Supabase が未設定です" };

  try {
    const { error: delRel } = await supabase.from(RELATIONS_TABLE).delete().neq("from_id", "");
    if (delRel) {
      console.error("delete relations error:", delRel);
      return { ok: false, error: delRel.message };
    }

    const { error: delKnow } = await supabase.from(KNOWLEDGE_TABLE).delete().neq("id", "");
    if (delKnow) {
      console.error("delete knowledge error:", delKnow);
      return { ok: false, error: delKnow.message };
    }

    if (nodes.length > 0) {
      const rows = nodes.map(knowledgeToRow);
      const { error: insKnow } = await supabase.from(KNOWLEDGE_TABLE).insert(rows);
      if (insKnow) {
        console.error("insert knowledge error:", insKnow);
        return { ok: false, error: insKnow.message };
      }
    }

    if (edges.length > 0) {
      const relRows = edges.map((e) => ({
        from_id: e.from,
        to_id: e.to,
        type: e.type,
        description: e.description ?? "",
      }));
      const { error: insRel } = await supabase.from(RELATIONS_TABLE).insert(relRows);
      if (insRel) {
        console.error("insert relations error:", insRel);
        return { ok: false, error: insRel.message };
      }
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
