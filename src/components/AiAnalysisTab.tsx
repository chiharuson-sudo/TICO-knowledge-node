"use client";

import { useState, useCallback } from "react";
import { EdgeReviewPanel, type EdgeCandidate } from "./EdgeReviewPanel";
import type { Knowledge, Relation } from "@/lib/types";
import type { ClassificationResult } from "@/lib/relation-classifier";

const DEFAULT_SETTINGS = {
  similarityThreshold: 0.72,
  confidenceThreshold: 0.6,
  maxCandidates: 20,
};

interface AiAnalysisTabProps {
  knowledge: Knowledge[];
  relations: Relation[];
  candidates: EdgeCandidate[];
  setCandidates: (c: EdgeCandidate[]) => void;
  isAnalyzing: boolean;
  setAnalyzing: (v: boolean) => void;
  onApprove: (fromId: string, toId: string, type: string, desc: string) => void;
  onReject: (fromId: string, toId: string) => void;
}

export function AiAnalysisTab({
  knowledge,
  relations,
  candidates,
  setCandidates,
  isAnalyzing,
  setAnalyzing,
  onApprove,
  onReject,
}: AiAnalysisTabProps) {
  const [embeddingProvider, setEmbeddingProvider] = useState<"openai" | "gemini">("openai");
  const [llmProvider, setLlmProvider] = useState<"anthropic" | "gemini">("anthropic");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [similarityThreshold, setSimilarityThreshold] = useState(
    DEFAULT_SETTINGS.similarityThreshold
  );
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    DEFAULT_SETTINGS.confidenceThreshold
  );
  const [maxCandidates, setMaxCandidates] = useState(DEFAULT_SETTINGS.maxCandidates);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (knowledge.length === 0) {
      setError("ナレッジがありません");
      return;
    }
    const ok = openaiKey.trim();
    const ak = anthropicKey.trim();
    const gk = geminiKey.trim();
    if (embeddingProvider === "openai" && !ok) {
      setError("Embedding に OpenAI を選択した場合は OpenAI API Key を入力してください");
      return;
    }
    if (embeddingProvider === "gemini" && !gk) {
      setError("Embedding に Gemini を選択した場合は Gemini API Key を入力してください");
      return;
    }
    if (llmProvider === "anthropic" && !ak) {
      setError("関係分類に Anthropic を選択した場合は Anthropic API Key を入力してください");
      return;
    }
    if (llmProvider === "gemini" && !gk) {
      setError("関係分類に Gemini を選択した場合は Gemini API Key を入力してください");
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const embRes = await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: knowledge,
          embeddingProvider,
          openaiApiKey: ok,
          geminiApiKey: gk,
        }),
      });
      if (!embRes.ok) {
        const err = await embRes.json().catch(() => ({}));
        throw new Error(err.error ?? `Embedding API ${embRes.status}`);
      }
      const { embeddings } = await embRes.json();

      const pairRes = await fetch("/api/cross-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: knowledge,
          embeddings,
          relations,
          threshold: similarityThreshold,
        }),
      });
      if (!pairRes.ok) {
        const err = await pairRes.json().catch(() => ({}));
        throw new Error(err.error ?? `会議横断API ${pairRes.status}`);
      }
      const { pairs } = await pairRes.json();
      const topPairs = (pairs ?? []).slice(0, maxCandidates);

      const nodeMap = new Map(knowledge.map((n) => [n.id, n]));
      const classified: EdgeCandidate[] = [];
      for (const p of topPairs) {
        const nodeA = nodeMap.get(p.fromId);
        const nodeB = nodeMap.get(p.toId);
        if (!nodeA || !nodeB) continue;
        const classRes = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodeA,
            nodeB,
            llmProvider,
            anthropicApiKey: ak,
            geminiApiKey: gk,
          }),
        });
        if (!classRes.ok) {
          const err = await classRes.json().catch(() => ({}));
          throw new Error(err.error ?? `分類API ${classRes.status}`);
        }
        const classification: ClassificationResult = await classRes.json();
        if (classification.hasRelation && (classification.confidence ?? 0) >= confidenceThreshold) {
          classified.push({
            fromId: p.fromId,
            toId: p.toId,
            similarity: p.similarity,
            fromSource: p.fromSource ?? "",
            toSource: p.toSource ?? "",
            classification,
          });
        }
      }
      setCandidates(classified);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCandidates([]);
    } finally {
      setAnalyzing(false);
    }
  }, [
    knowledge,
    relations,
    embeddingProvider,
    openaiKey,
    llmProvider,
    anthropicKey,
    geminiKey,
    similarityThreshold,
    confidenceThreshold,
    maxCandidates,
    setCandidates,
    setAnalyzing,
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h2 className="text-lg font-semibold text-slate-100">AI分析 — 会議横断エッジ候補</h2>

      <div className="rounded-xl border border-slate-600 bg-slate-800/60 p-4 space-y-4">
        <h3 className="text-sm font-medium text-slate-300">APIキー設定（MVP: セッション内のみ保持・いずれか選択でOK）</h3>
        <div className="grid gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400">Embedding（類似度計算用）</span>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="embeddingProvider"
                  checked={embeddingProvider === "openai"}
                  onChange={() => setEmbeddingProvider("openai")}
                  className="rounded border-slate-500 text-cyan-500"
                />
                <span className="text-slate-300">OpenAI</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="embeddingProvider"
                  checked={embeddingProvider === "gemini"}
                  onChange={() => setEmbeddingProvider("gemini")}
                  className="rounded border-slate-500 text-cyan-500"
                />
                <span className="text-slate-300">Gemini</span>
              </label>
            </div>
            {embeddingProvider === "openai" && (
              <label className="flex flex-col gap-1 pt-1">
                <span className="text-slate-500 text-xs">OpenAI API Key</span>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-200"
                />
              </label>
            )}
            {embeddingProvider === "gemini" && (
              <label className="flex flex-col gap-1 pt-1">
                <span className="text-slate-500 text-xs">Gemini API Key（Embedding用）</span>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-200"
                />
              </label>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-slate-400">関係分類（LLM）</span>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="llmProvider"
                  checked={llmProvider === "anthropic"}
                  onChange={() => setLlmProvider("anthropic")}
                  className="rounded border-slate-500 text-cyan-500"
                />
                <span className="text-slate-300">Anthropic (Claude)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="llmProvider"
                  checked={llmProvider === "gemini"}
                  onChange={() => setLlmProvider("gemini")}
                  className="rounded border-slate-500 text-cyan-500"
                />
                <span className="text-slate-300">Gemini</span>
              </label>
            </div>
            {llmProvider === "anthropic" && (
              <label className="flex flex-col gap-1 pt-1">
                <span className="text-slate-500 text-xs">Anthropic API Key</span>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-200"
                />
              </label>
            )}
            {llmProvider === "gemini" && (
              <label className="flex flex-col gap-1 pt-1">
                <span className="text-slate-500 text-xs">Gemini API Key（関係分類用）</span>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza..."
                  className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-slate-200"
                />
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <span className="text-slate-400">類似度閾値</span>
              <input
                type="number"
                min={0.5}
                max={1}
                step={0.01}
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                className="w-20 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-slate-400">確信度閾値</span>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-20 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-slate-400">LLM分類する最大ペア数</span>
              <input
                type="number"
                min={1}
                max={50}
                value={maxCandidates}
                onChange={(e) => setMaxCandidates(Number(e.target.value))}
                className="w-16 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-200"
              />
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {isAnalyzing ? "分析中…" : "分析開始"}
        </button>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>

      <EdgeReviewPanel
        candidates={candidates}
        allNodes={knowledge}
        onApprove={onApprove}
        onReject={onReject}
        isLoading={isAnalyzing}
      />
    </div>
  );
}
