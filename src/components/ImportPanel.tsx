"use client";

import { useState } from "react";
import { parseKnowledgeTable, parseRelationsTable } from "@/lib/table-parser";
import type { Knowledge, Relation } from "@/lib/types";
import { VIEWPOINT_COLORS, RELATION_COLORS, DEFAULT_VIEWPOINT_COLOR } from "@/lib/colors";

export type ImportResult = { ok: true } | { ok: false; error: string };

interface ImportPanelProps {
  onImport: (nodes: Knowledge[], edges: Relation[]) => void | Promise<ImportResult>;
  importStats: { nodes: number; edges: number } | null;
}

type PreviewState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "ok";
      nodes: Knowledge[];
      edges: Relation[];
      productCount: number;
      domainCount: number;
      typeCounts: Record<string, number>;
      /** 関係テーブルを解析した場合のマッチングログ */
      relationLog?: { totalRows: number; matchedRows: number };
    };

const KNOWLEDGE_PLACEHOLDER = `[充電器]*[共通]*[共通]：PWA信号転落故障で...\t⑧再発防止・未然防止\t■観点の内容...\t["充電器"]\t["共通"]\t["共通"]\t["共通"]\tソース名\tドメイン名`;

const RELATION_PLACEHOLDER = `①→②：前提\t説明文\tソース名\tFrom_ナレッジキー\tTo_ナレッジキー\t前提`;

export function ImportPanel({ onImport, importStats }: ImportPanelProps) {
  const [rawKnowledge, setRawKnowledge] = useState("");
  const [rawRelations, setRawRelations] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ status: "idle" });
  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectError, setReflectError] = useState<string | null>(null);

  const canReflect =
    preview.status === "ok" && preview.nodes.length > 0 && !isReflecting;

  const handleParsePreview = () => {
    const knowledgeText = rawKnowledge.trim();
    if (!knowledgeText) {
      setPreview({ status: "error", message: "ナレッジテーブルを貼り付けてください" });
      return;
    }

    try {
      const nodes = parseKnowledgeTable(knowledgeText);
      if (nodes.length === 0) {
        setPreview({
          status: "error",
          message:
            "ナレッジが1件も解析できませんでした。タブ区切り形式を確認してください。",
        });
        return;
      }

      let edges: Relation[] = [];
      let relationLog: { totalRows: number; matchedRows: number } | undefined;
      if (rawRelations.trim()) {
        const result = parseRelationsTable(rawRelations.trim(), nodes);
        edges = result.edges;
        relationLog = { totalRows: result.totalRows, matchedRows: result.matchedRows };
        result.sourceMap.forEach((source, nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          if (node) node.source = source;
        });
      }
      nodes.forEach((node) => {
        if (!node.source) node.source = "不明";
      });

      const productCount = new Set(nodes.map((n) => n.product)).size;
      const domainCount = new Set(nodes.map((n) => n.domain).filter(Boolean)).size;
      const typeCounts: Record<string, number> = { 前提: 0, 因果: 0, 対策: 0, 波及: 0 };
      edges.forEach((e) => {
        typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
      });

      setPreview({
        status: "ok",
        nodes,
        edges,
        productCount,
        domainCount,
        typeCounts,
        relationLog,
      });
    } catch (err) {
      setPreview({
        status: "error",
        message: "パースエラー: " + (err instanceof Error ? err.message : String(err)),
      });
    }
  };

  const handleReflect = async () => {
    if (preview.status !== "ok" || preview.nodes.length === 0 || isReflecting) return;
    setReflectError(null);
    setIsReflecting(true);
    try {
      const result = await Promise.resolve(onImport(preview.nodes, preview.edges));
      if (result && !result.ok) setReflectError(result.error ?? "反映に失敗しました");
    } catch (err) {
      setReflectError(err instanceof Error ? err.message : "反映に失敗しました");
    } finally {
      setIsReflecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/60 p-4 backdrop-blur">
        <h3 className="mb-2 text-sm font-semibold text-slate-200">
          1. ナレッジテーブル（タブ区切り）<span className="text-rose-400"> *必須</span>
        </h3>
        <p className="mb-2 text-xs text-slate-400">
          レコード境界: 1行に <code className="rounded bg-slate-700/80 px-1">["..."]</code> を2個以上含む行で区切ります。本文が複数行（■観点の内容・■技術的根拠等）でも1レコードとして解析されます。
        </p>
        <textarea
          value={rawKnowledge}
          onChange={(e) => setRawKnowledge(e.target.value)}
          placeholder={KNOWLEDGE_PLACEHOLDER}
          rows={10}
          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div className="rounded-xl border border-slate-700/80 bg-slate-800/60 p-4 backdrop-blur">
        <h3 className="mb-2 text-sm font-semibold text-slate-200">
          2. 関係テーブル（タブ区切り）<span className="text-slate-500"> 任意</span>
        </h3>
        <p className="mb-2 text-xs text-slate-400">
          From/Toキーのフォーマット揺れを吸収: 「：」以降のタイトルで正規化し、titleKey完全一致 → タイトル一致・包含 → 先頭12文字の前方一致の3段階でナレッジにマッチします。
        </p>
        <textarea
          value={rawRelations}
          onChange={(e) => setRawRelations(e.target.value)}
          placeholder={RELATION_PLACEHOLDER}
          rows={4}
          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleParsePreview}
          className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
        >
          解析プレビュー
        </button>
        {preview.status === "ok" && preview.nodes.length > 0 && (
          <button
            type="button"
            onClick={() => void handleReflect()}
            disabled={isReflecting}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {isReflecting ? "反映中…" : "グラフに反映（全員に共有）"}
          </button>
        )}
      </div>
      {reflectError && (
        <div className="rounded-lg border border-rose-500/50 bg-rose-900/20 px-4 py-2 text-sm text-rose-200">
          {reflectError}
        </div>
      )}

      {preview.status === "error" && (
        <div className="rounded-lg border border-rose-500/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
          {preview.message}
        </div>
      )}

      {preview.status === "ok" && (
        <div className="space-y-4 rounded-xl border border-slate-700/80 bg-slate-800/60 p-4">
          <h3 className="text-sm font-semibold text-slate-200">解析プレビュー</h3>

          {preview.relationLog !== undefined && preview.relationLog.totalRows > 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-slate-300">
                ℹ 関係行 {preview.relationLog.totalRows} 件中 {preview.relationLog.matchedRows} 件マッチ成功
              </span>
              {preview.relationLog.matchedRows < preview.relationLog.totalRows && (
                <span className="text-amber-400">
                  ⚠ {preview.relationLog.totalRows - preview.relationLog.matchedRows} 件のマッチ失敗（From/Toがナレッジに見つからない）
                </span>
              )}
              {preview.nodes.some((n) => n.source && n.source !== "不明") && (
                <span className="text-cyan-400">
                  ✓ 会議（source）付与: {preview.nodes.filter((n) => n.source && n.source !== "不明").length} 件
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-900/80 px-3 py-2 text-center">
              <div className="text-2xl font-bold text-cyan-400">{preview.nodes.length}</div>
              <div className="text-xs text-slate-400">ナレッジ数</div>
            </div>
            <div className="rounded-lg bg-slate-900/80 px-3 py-2 text-center">
              <div className="text-2xl font-bold text-cyan-400">{preview.edges.length}</div>
              <div className="text-xs text-slate-400">関係数</div>
            </div>
            <div className="rounded-lg bg-slate-900/80 px-3 py-2 text-center">
              <div className="text-2xl font-bold text-slate-300">{preview.productCount}</div>
              <div className="text-xs text-slate-400">製品数</div>
            </div>
            <div className="rounded-lg bg-slate-900/80 px-3 py-2 text-center">
              <div className="text-2xl font-bold text-slate-300">{preview.domainCount}</div>
              <div className="text-xs text-slate-400">ドメイン数</div>
            </div>
          </div>

          <div>
            <h4 className="mb-1 text-xs font-medium text-slate-400">ナレッジ先頭5件</h4>
            <ul className="space-y-1.5 text-xs">
              {preview.nodes.slice(0, 5).map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center gap-2 rounded border border-slate-700/80 bg-slate-900/50 px-2 py-1.5"
                >
                  <span className="font-mono text-slate-500">{n.id}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-medium"
                    style={{
                      background: (VIEWPOINT_COLORS[n.viewpoint] ?? DEFAULT_VIEWPOINT_COLOR) + "30",
                      color: VIEWPOINT_COLORS[n.viewpoint] ?? DEFAULT_VIEWPOINT_COLOR,
                    }}
                  >
                    {n.viewpoint}
                  </span>
                  <span className="truncate text-slate-300">{n.title}</span>
                  <span className="text-slate-500">{n.product}</span>
                  {n.source && n.source !== "不明" && (
                    <span className="rounded bg-cyan-900/40 px-1.5 py-0.5 text-xs text-cyan-300">{n.source}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {preview.edges.length > 0 && (
            <>
              <div>
                <h4 className="mb-1 text-xs font-medium text-slate-400">関係先頭5件</h4>
                <ul className="space-y-1.5 text-xs">
                  {preview.edges.slice(0, 5).map((e, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded border border-slate-700/80 bg-slate-900/50 px-2 py-1.5"
                    >
                      <span
                        className="rounded px-1.5 py-0.5 font-medium"
                        style={{
                          background: (RELATION_COLORS[e.type] ?? "#64748b") + "30",
                          color: RELATION_COLORS[e.type] ?? "#64748b",
                        }}
                      >
                        {e.type}
                      </span>
                      <span className="text-slate-400">
                        {e.from} → {e.to}
                      </span>
                      {e.description && (
                        <span className="truncate text-slate-500">{e.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-medium text-slate-400">関係タイプ内訳</h4>
                <div className="flex flex-wrap gap-2">
                  {(["前提", "因果", "対策", "波及"] as const).map((t) => (
                    <span
                      key={t}
                      className="rounded px-2 py-1 text-xs"
                      style={{
                        background: (RELATION_COLORS[t] ?? "#64748b") + "20",
                        color: RELATION_COLORS[t] ?? "#64748b",
                      }}
                    >
                      {t}: {preview.typeCounts[t] ?? 0}件
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {importStats && (
        <p className="text-xs text-slate-500">
          直近の取込: {importStats.nodes}ノード / {importStats.edges}関係
        </p>
      )}
    </div>
  );
}
