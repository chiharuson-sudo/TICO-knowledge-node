"use client";

import { useCallback, useMemo, useState } from "react";
import { useGraphDimensions } from "@/lib/use-dimensions";
import { FilterBar } from "@/components/FilterBar";
import { HubRanking } from "@/components/HubRanking";
import { DetailPanel } from "@/components/DetailPanel";
import { KnowledgeGraph } from "@/components/KnowledgeGraph";
import { StatsBar } from "@/components/StatsBar";
import { EdgeVerbalizerList } from "@/components/EdgeVerbalizerList";
import { AddKnowledgeForm } from "@/components/AddKnowledgeForm";
import { ImportPanel } from "@/components/ImportPanel";
import { buildFilteredGraph } from "@/lib/graph-engine";
import type { Knowledge, Relation, Filters } from "@/lib/types";

import knowledgeData from "@/data/knowledge.json";
import relationsData from "@/data/relations.json";

const initialKnowledge = knowledgeData as Knowledge[];
const initialRelations = relationsData as Relation[];

const initialFilters: Filters = {
  product: "全て",
  timeline: "全て",
  client: "全て",
  flow: "全て",
  domain: "全て",
  viewpoint: "全て",
};

const HEADER_OFFSET = 220;

type TabId = "graph" | "add" | "import";

export default function Home() {
  const [knowledge, setKnowledge] = useState<Knowledge[]>(initialKnowledge);
  const [relations, setRelations] = useState<Relation[]>(initialRelations);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("graph");
  const [importStats, setImportStats] = useState<{ nodes: number; edges: number } | null>(null);
  const { width, height } = useGraphDimensions(HEADER_OFFSET);

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

  const handleImport = useCallback((newNodes: Knowledge[], newEdges: Relation[]) => {
    setKnowledge(newNodes);
    setRelations(newEdges);
    setImportStats({ nodes: newNodes.length, edges: newEdges.length });
    setFilters(initialFilters);
    setSelectedId(null);
    setTab("graph");
  }, []);

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
          />
        </div>
      ) : tab === "import" ? (
        <main className="flex-1 overflow-y-auto">
          <ImportPanel onImport={handleImport} importStats={importStats} />
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto py-6">
          <AddKnowledgeForm knowledge={knowledge} onSubmit={handleAddKnowledge} />
        </main>
      )}
    </div>
  );
}
