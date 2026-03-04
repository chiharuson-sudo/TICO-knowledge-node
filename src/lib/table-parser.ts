import type { Knowledge, Relation, RelationType } from "./types";
import { inferDomain, inferFlow } from "./domain-inference";

/**
 * 配列フィールドのパース: ["充電器"] → "充電器"、なければ "共通"
 */
function parseArrayField(s: string): string {
  if (!s || !s.trim()) return "共通";
  const m = s.match(/\["?([^"\]]+)"?\]/);
  return m ? m[1].trim() : s.trim() || "共通";
}

/**
 * レコード末尾の3つの配列フィールド（product, timeline, client）を抽出する正規表現
 */
const END_ARRAYS_REGEX = /\t(\["[^"]*"\])\s*\t(\["[^"]*"\])\s*\t(\["[^"]*"\])\s*$/;

/**
 * ナレッジテーブル（v2: 複数行レコード対応）
 * レコード境界: ["..."] を2個以上含む行で区切る
 */
export function parseKnowledgeTable(raw: string): Knowledge[] {
  const lines = raw.split("\n");
  const records: string[] = [];
  let currentLines: string[] = [];

  for (const line of lines) {
    currentLines.push(line);
    const arrayMatches = line.match(/\["[^"]*"\]/g);
    if (arrayMatches && arrayMatches.length >= 2) {
      records.push(currentLines.join("\n"));
      currentLines = [];
    }
  }
  if (currentLines.some((l) => l.trim())) {
    records.push(currentLines.join("\n"));
  }

  const nodes: Knowledge[] = [];
  let idx = 1;

  for (const record of records) {
    const trimmed = record.trim();
    if (!trimmed) continue;

    let mainPart: string;
    let product = "共通";
    let timeline = "共通";
    let client = "共通";

    const endMatch = trimmed.match(END_ARRAYS_REGEX);
    if (endMatch) {
      product = parseArrayField(endMatch[1]);
      timeline = parseArrayField(endMatch[2]);
      client = parseArrayField(endMatch[3]);
      mainPart = trimmed.slice(0, trimmed.length - endMatch[0].length).trim();
    } else {
      mainPart = trimmed;
    }

    const firstTab = mainPart.indexOf("\t");
    const secondTab = mainPart.indexOf("\t", firstTab + 1);
    if (firstTab < 0 || secondTab < 0) continue;

    const titleKey = mainPart.slice(0, firstTab).trim();
    const viewpoint = mainPart.slice(firstTab + 1, secondTab).trim();
    const content = mainPart.slice(secondTab + 1).trim();

    let title = titleKey;
    const colonIdx = titleKey.indexOf("：");
    if (colonIdx >= 0) {
      title = titleKey.slice(colonIdx + 1);
    }
    title = title.replace(/_[①②③④⑤⑥⑦⑧⑨].+$/, "").trim();

    if (!title || !viewpoint) continue;

    const flow = inferFlow(titleKey);
    const domain = inferDomain(titleKey, content);

    nodes.push({
      id: `K${String(idx).padStart(2, "0")}`,
      title,
      titleKey,
      viewpoint,
      content,
      product,
      timeline,
      client,
      flow,
      domain,
      source: "",
    });
    idx++;
  }
  return nodes;
}

const RELATION_TYPES: RelationType[] = ["前提", "因果", "対策", "波及"];

function normalizeRelationType(type: string): RelationType {
  const t = type.trim();
  return RELATION_TYPES.includes(t as RelationType) ? (t as RelationType) : "前提";
}

/**
 * "："以降のタイトル部分を抽出し、観点サフィックスを除去
 */
function extractTitle(key: string): string {
  const k = key.trim();
  const colonIdx = k.indexOf("：");
  const afterColon = colonIdx >= 0 ? k.slice(colonIdx + 1) : k;
  return afterColon.replace(/_[①②③④⑤⑥⑦⑧⑨].+$/, "").trim();
}

export interface ParseRelationsResult {
  edges: Relation[];
  totalRows: number;
  matchedRows: number;
}

/**
 * 関係テーブル（v2: 3段階マッチング + マッチングログ用の件数返却）
 */
export function parseRelationsTable(
  raw: string,
  knowledgeNodes: Knowledge[]
): ParseRelationsResult {
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const edges: Relation[] = [];
  let totalRows = 0;
  let matchedRows = 0;

  const matchNode = (key: string): string | null => {
    const k = key.trim();
    if (!k) return null;

    const title = extractTitle(k);
    const nt = title.replace(/\s+/g, "");

    let found = knowledgeNodes.find((n) => n.titleKey === k);
    if (found) return found.id;

    found = knowledgeNodes.find(
      (n) => n.title.replace(/\s+/g, "") === nt
    );
    if (found) return found.id;
    found = knowledgeNodes.find((n) => {
      const a = n.title.replace(/\s+/g, "");
      return a.includes(nt) || nt.includes(a);
    });
    if (found) return found.id;

    const prefix = nt.slice(0, 12);
    if (prefix.length >= 6) {
      found = knowledgeNodes.find((n) =>
        n.title.replace(/\s+/g, "").startsWith(prefix)
      );
      if (found) return found.id;
    }
    return null;
  };

  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 5) continue;

    totalRows++;
    const desc = (cols[1] ?? "").trim();
    const fromKey = (cols[3] ?? "").trim();
    const toKey = (cols[4] ?? "").trim();
    const typeStr = (
      cols[5] ??
      (cols[0]?.match(/：(.+)$/)?.[1] ?? "") ??
      ""
    ).trim();
    const type = normalizeRelationType(typeStr);

    const fromId = matchNode(fromKey);
    const toId = matchNode(toKey);

    if (fromId && toId && fromId !== toId) {
      edges.push({
        from: fromId,
        to: toId,
        type,
        description: desc,
      });
      matchedRows++;
    }
  }

  return { edges, totalRows, matchedRows };
}
