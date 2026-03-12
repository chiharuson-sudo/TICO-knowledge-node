import type { Relation } from "./types";
import { CONFIDENCE_SILENT_APPROVE } from "./relation-constants";

/**
 * サイレント承認タスク（ドラフト）
 * auto_approve_at を過ぎた pending かつ高確信度の関係を silent_approved に更新する。
 *
 * 実行方法の例:
 * - クライアント: setInterval で定期的に runAutoApprove(relations, setRelations) を呼ぶ
 * - Vercel Cron: API Route を /api/cron/auto-approve で作成し、この関数を呼んだあと DB を更新
 * - Supabase: Edge Function または pg_cron で定期的に UPDATE relations SET status = 'silent_approved'
 *   WHERE status = 'pending' AND confidence_score >= 0.9 AND auto_approve_at <= now();
 */
export function runAutoApprove(
  relations: Relation[],
  now: Date = new Date()
): Relation[] {
  const iso = now.toISOString();
  return relations.map((r) => {
    if (r.status !== "pending" && r.status !== undefined) return r;
    if ((r.confidence_score ?? 0) < CONFIDENCE_SILENT_APPROVE) return r;
    if (!r.auto_approve_at || r.auto_approve_at > iso) return r;
    return { ...r, status: "silent_approved" as const };
  });
}

/**
 * 変更の有無を返す。呼び出し側で DB 反映の要否を判定するのに使う。
 */
export function runAutoApproveDry(
  relations: Relation[],
  now: Date = new Date()
): { updated: Relation[]; changed: boolean } {
  const updated = runAutoApprove(relations, now);
  const changed =
    relations.length !== updated.length ||
    relations.some((r, i) => r.status !== updated[i].status);
  return { updated, changed };
}
