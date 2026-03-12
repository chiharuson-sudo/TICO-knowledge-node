"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGraphDimensions } from "@/lib/use-dimensions";
import { useSupabaseSync } from "@/lib/use-supabase-sync";
import {
  fetchKnowledgeFromSupabase,
  fetchRelationsFromSupabase,
  replaceAllKnowledgeAndRelations,
} from "@/lib/data-supabase";
import { isSupabaseEnabled } from "@/lib/supabase";
import { FilterBar } from "@/components/FilterBar";
import { HubRanking } from "@/components/HubRanking";
import { DetailPanel } from "@/components/DetailPanel";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { StatsBar } from "@/components/StatsBar";
import { EdgeVerbalizerList } from "@/components/EdgeVerbalizerList";
import { AddKnowledgeForm } from "@/components/AddKnowledgeForm";
import { ImportPanel } from "@/components/ImportPanel";
import { AiAnalysisTab } from "@/components/AiAnalysisTab";
import { BatchRelationsView } from "@/components/BatchRelationsView";
import { KnowledgeVerificationView, type KnowledgeReviewStatus } from "@/components/KnowledgeVerificationView";
import { buildFilteredGraph } from "@/lib/graph-engine";
import { runAutoApproveDry } from "@/lib/autoApproveTask";
import type { Knowledge, Relation, Filters, RelationType } from "@/lib/types";
import type { EdgeCandidate } from "@/components/EdgeReviewPanel";

import knowledgeData from "@/data/knowledge.json";
import relationsData from "@/data/relations.json";

const fallbackKnowledge = knowledgeData as Knowledge[];
const fallbackRelations = relationsData as Relation[];

const initialFilters: Filters = {
  product: "全て",
  timeline: "全て",
  client: "全て",
  flow: "全て",
  domain: "全て",
  viewpoint: "全て",
};

const HEADER_OFFSET = 220;

type TabId = "graph" | "add" | "import" | "ai" | "relations" | "knowledge-review";

export default function Home() {
  const [knowledge, setKnowledge] = useState<Knowledge[]>(fallbackKnowledge);
  const [relations, setRelations] = useState<Relation[]>(fallbackRelations);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("graph");
  const [importStats, setImportStats] = useState<{ nodes: number; edges: number } | null>(null);
  const [edgeCandidates, setEdgeCandidates] = useState<EdgeCandidate[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [knowledgeReviewStatusMap, setKnowledgeReviewStatusMap] = useState<Record<string, KnowledgeReviewStatus>>({});
  const [sourceDocuments, setSourceDocuments] = useState<Record<string, string>>({});
  const { width, height } = useGraphDimensions(HEADER_OFFSET);

  // Supabase から初回取得（共有データがあれば上書き）
  useEffect(() => {
    if (!isSupabaseEnabled()) return;
    let cancelled = false;
    (async () => {
      const [k, r] = await Promise.all([
        fetchKnowledgeFromSupabase(),
        fetchRelationsFromSupabase(),
      ]);
      if (!cancelled && k && r) {
        setKnowledge(k.length > 0 ? k : fallbackKnowledge);
        setRelations(r);
        if (k.length > 0) setImportStats({ nodes: k.length, edges: r.length });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 誰かが取込したら全員に反映（Realtime 購読）
  useSupabaseSync(useCallback((k: Knowledge[], r: Relation[]) => {
    setKnowledge(k.length > 0 ? k : fallbackKnowledge);
    setRelations(r);
    setImportStats(k.length > 0 ? { nodes: k.length, edges: r.length } : null);
  }, []));

  // サイレント承認: auto_approve_at を過ぎた関係を自動で silent_approved に更新
  useEffect(() => {
    const { updated, changed } = runAutoApproveDry(relations);
    if (changed) setRelations(updated);
  }, [relations]);

  const graphResult = useMemo(
    () => buildFilteredGraph(knowledge, relations, filters),
    [knowledge, relations, filters]
  );

  const handleAddKnowledge = useCallback((k: Knowledge) => {
    setKnowledge((prev) => [...prev, k]);
    setTab("graph");
  }, []);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApproveEdge = useCallback(
    (fromId: string, toId: string, type: string, desc: string, confidence?: number) => {
      const relType = (["前提", "因果", "対策", "波及"].includes(type) ? type : "前提") as RelationType;
      const conf = confidence ?? 0;
      const autoApproveAt =
        conf >= 0.9
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : undefined;
      const newRelation: Relation = {
        from: fromId,
        to: toId,
        type: relType,
        description: desc,
        evidence_text: desc,
        confidence_score: conf,
        status: conf >= 0.9 ? "pending" : "approved",
        auto_approve_at: autoApproveAt,
      };
      const newRelations = [...relations, newRelation];
      setRelations(newRelations);
      setEdgeCandidates((prev) =>
        prev.filter((c) => !(c.fromId === fromId && c.toId === toId) && !(c.fromId === toId && c.toId === fromId))
      );
      if (isSupabaseEnabled()) {
        replaceAllKnowledgeAndRelations(knowledge, newRelations).then((r) => {
          if (!r.ok) console.error("Supabase 反映失敗:", r.error);
        });
      }
    },
    [knowledge, relations]
  );

  const handleRejectEdge = useCallback((fromId: string, toId: string) => {
    setEdgeCandidates((prev) =>
      prev.filter((c) => !(c.fromId === fromId && c.toId === toId) && !(c.fromId === toId && c.toId === fromId))
    );
  }, []);

  const handleRelationApprove = useCallback(
    (from: string, to: string) => {
      const newRelations = relations.map((e) =>
        e.from === from && e.to === to ? { ...e, status: "approved" as const } : e
      );
      setRelations(newRelations);
      if (isSupabaseEnabled()) {
        replaceAllKnowledgeAndRelations(knowledge, newRelations).then((r) => {
          if (!r.ok) console.error("Supabase 反映失敗:", r.error);
        });
      }
    },
    [knowledge, relations]
  );

  const handleRelationReject = useCallback(
    (from: string, to: string) => {
      const newRelations = relations.filter((e) => !(e.from === from && e.to === to));
      setRelations(newRelations);
      if (isSupabaseEnabled()) {
        replaceAllKnowledgeAndRelations(knowledge, newRelations).then((r) => {
          if (!r.ok) console.error("Supabase 反映失敗:", r.error);
        });
      }
    },
    [knowledge, relations]
  );

  const handleRelationChangeType = useCallback(
    (from: string, to: string, newType: RelationType) => {
      const newRelations = relations.map((e) =>
        e.from === from && e.to === to ? { ...e, type: newType, status: "changed" as const } : e
      );
      setRelations(newRelations);
      if (isSupabaseEnabled()) {
        replaceAllKnowledgeAndRelations(knowledge, newRelations).then((r) => {
          if (!r.ok) console.error("Supabase 反映失敗:", r.error);
        });
      }
    },
    [knowledge, relations]
  );

  const handleKnowledgeReviewStatusChange = useCallback((id: string, status: KnowledgeReviewStatus) => {
    setKnowledgeReviewStatusMap((prev) => ({ ...prev, [id]: status }));
  }, []);

  const handleKnowledgeEdit = useCallback(
    (id: string, patch: { title?: string; content?: string }) => {
      const newKnowledge = knowledge.map((k) =>
        k.id === id ? { ...k, ...patch } : k
      );
      setKnowledge(newKnowledge);
      if (isSupabaseEnabled()) {
        replaceAllKnowledgeAndRelations(newKnowledge, relations).then((r) => {
          if (!r.ok) console.error("Supabase 反映失敗:", r.error);
        });
      }
    },
    [knowledge, relations]
  );

  const handleImport = useCallback(
    async (
      newNodes: Knowledge[],
      newEdges: Relation[]
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (isSupabaseEnabled()) {
        const result = await replaceAllKnowledgeAndRelations(newNodes, newEdges);
        if (!result.ok) return { ok: false, error: result.error ?? "反映に失敗しました" };
      }
      setKnowledge(newNodes);
      setRelations(newEdges);
      setImportStats({ nodes: newNodes.length, edges: newEdges.length });
      setFilters(initialFilters);
      setSelectedId(null);
      setTab("graph");
      return { ok: true };
    },
    []
  );

  const selectedNode = useMemo(
    () => graphResult.nodes.find((n) => n.id === selectedId) ?? null,
    [graphResult.nodes, selectedId]
  );

  return (
    <div className="flex h-screen min-h-screen flex-col bg-[#0a0e1a] text-slate-200">
      <header className="shrink-0 border-b border-slate-700/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-slate-100">
            ナレッジグラフ — ノード重視可視化
          </h1>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs ${isSupabaseEnabled() ? "text-emerald-400" : "text-slate-500"}`}
              title={isSupabaseEnabled() ? "Supabase 接続済み。取込は全員に反映されます。" : "Supabase 未設定。取込はこの端末のみです。"}
            >
              {isSupabaseEnabled() ? "共有: オン" : "共有: オフ"}
            </span>
            {importStats && (
              <span className="text-xs text-slate-500">
                取込: {importStats.nodes}ノード / {importStats.edges}関係
              </span>
            )}
            <div className="flex rounded-lg bg-slate-800/80 p-0.5">
              <button
                type="button"
                onClick={() => setTab("graph")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === "graph"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                グラフ
              </button>
              <button
                type="button"
                onClick={() => setTab("add")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === "add"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ナレッジを追加
              </button>
              <button
                type="button"
                onClick={() => setTab("import")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === "import"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                📋 データ取込
              </button>
              <button
                type="button"
                onClick={() => setTab("ai")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === "ai"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🤖 AI分析
              </button>
              <button
                type="button"
                onClick={() => setTab("relations")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === "relations"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                関係性FB
              </button>
              <button
                type="button"
                onClick={() => setTab("knowledge-review")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === "knowledge-review"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ナレッジ確認
              </button>
            </div>
          </div>
        </div>
        {tab === "graph" && (
          <>
            <div className="mt-2">
              <FilterBar
                knowledge={knowledge}
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <HubRanking
                nodes={graphResult.nodes}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <StatsBar
                nodeCount={graphResult.nodes.length}
                edgeCount={graphResult.edges.length}
                maxDegree={graphResult.maxDegree}
              />
            </div>
            <div className="mt-2">
              <EdgeVerbalizerList
                nodes={graphResult.nodes}
                edges={graphResult.edges}
              />
            </div>
          </>
        )}
      </header>

      {tab === "graph" ? (
        <div className="flex flex-1 min-h-0">
          <main className="relative flex-1 min-w-0">
            <div className="absolute inset-0">
              <KnowledgeGraph
                nodes={graphResult.nodes}
                edges={graphResult.edges}
                selectedId={selectedId}
                onSelectNode={setSelectedId}
                width={width}
                height={height}
              />
            </div>
          </main>
          <DetailPanel
            node={selectedNode}
            nodes={graphResult.nodes}
            edges={graphResult.edges}
            onSelectNode={setSelectedId}
            onRelationApprove={handleRelationApprove}
            onRelationReject={handleRelationReject}
            onRelationChangeType={handleRelationChangeType}
          />
        </div>
      ) : tab === "import" ? (
        <main className="flex-1 overflow-y-auto">
          <ImportPanel onImport={handleImport} importStats={importStats} />
        </main>
      ) : tab === "ai" ? (
        <main className="flex-1 overflow-y-auto">
          <AiAnalysisTab
            knowledge={knowledge}
            relations={relations}
            candidates={edgeCandidates}
            setCandidates={setEdgeCandidates}
            isAnalyzing={isAnalyzing}
            setAnalyzing={setIsAnalyzing}
            onApprove={handleApproveEdge}
            onReject={handleRejectEdge}
          />
        </main>
      ) : tab === "relations" ? (
        <main className="flex-1 overflow-y-auto">
          <BatchRelationsView
            nodes={knowledge}
            edges={relations}
            onRelationApprove={handleRelationApprove}
            onRelationReject={handleRelationReject}
            onRelationChangeType={handleRelationChangeType}
          />
        </main>
      ) : tab === "knowledge-review" ? (
        <main className="flex-1 overflow-y-auto">
          <KnowledgeVerificationView
            knowledge={knowledge}
            relations={relations}
            sourceDocuments={sourceDocuments}
            onSourceDocumentChange={(source, text) =>
              setSourceDocuments((prev) => ({ ...prev, [source]: text }))
            }
            reviewStatusMap={knowledgeReviewStatusMap}
            onReviewStatusChange={handleKnowledgeReviewStatusChange}
            onKnowledgeEdit={handleKnowledgeEdit}
            onRelationApprove={handleRelationApprove}
            onRelationReject={handleRelationReject}
            onRelationChangeType={handleRelationChangeType}
          />
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto py-6">
          <AddKnowledgeForm knowledge={knowledge} onSubmit={handleAddKnowledge} />
        </main>
      )}
    </div>
  );
}
