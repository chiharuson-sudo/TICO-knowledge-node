import type { Knowledge } from "./types";

export type RelationTypeLabel = "前提" | "因果" | "対策" | "波及";

export interface ClassificationResult {
  hasRelation: boolean;
  type: RelationTypeLabel | null;
  direction: "A_to_B" | "B_to_A" | null;
  reason: string;
  confidence: number;
}

/**
 * LLM用プロンプト文を組み立て（API側でも利用）
 */
export function buildClassificationPrompt(nodeA: Knowledge, nodeB: Knowledge): string {
  const contentA = (nodeA.content ?? "").slice(0, 800);
  const contentB = (nodeB.content ?? "").slice(0, 800);
  return `あなたは製造業のエレクトロニクス設計ナレッジの専門家です。
以下の2つのナレッジの関係を判定してください。

## ナレッジA
タイトル: ${nodeA.title}
観点: ${nodeA.viewpoint}
製品: ${nodeA.product}
ドメイン: ${nodeA.domain}
内容: ${contentA || "なし"}

## ナレッジB
タイトル: ${nodeB.title}
観点: ${nodeB.viewpoint}
製品: ${nodeB.product}
ドメイン: ${nodeB.domain}
内容: ${contentB || "なし"}

## 判定基準
- 前提: AがBの前提知識・条件になっている（Bを理解するにはAを知っている必要がある）
- 因果: AがBの直接原因（Aが起きたらBが起きる）
- 対策: AがBの対策・解決策（Bの問題をAで防げる）
- 波及: Aの変更・影響がBに波及する（Aを変えたらBも見直す必要がある）

## 判定観点（会議横断の接続）
1. 同一技術メカニズム: 異なる事象だが同じ技術原理に起因するか
2. 同一対策パターン: 異なる問題だが同じ種類の対策が有効か
3. 前提知識の共有: 一方を理解するのに他方の知識が前提になるか
4. 製品横断の共通教訓: 異なる製品だが同じ失敗パターン・設計思想か

## 出力形式（JSONのみ、説明は不要）
{"hasRelation": true または false, "type": "前提"|"因果"|"対策"|"波及" または null, "direction": "A_to_B"|"B_to_A" または null, "reason": "判定理由を日本語で1-2文", "confidence": 0.0以上1.0以下の数値}

関係がない場合は hasRelation: false にしてください。確信度0.6以上のもののみ hasRelation: true にしてください。`;
}
