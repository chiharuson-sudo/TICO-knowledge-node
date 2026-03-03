"use client";

import { useState, useMemo } from "react";
import type { Knowledge } from "@/lib/types";
import { VIEWPOINT_COLORS } from "@/lib/colors";

const VIEWPOINTS = Object.keys(VIEWPOINT_COLORS);

function getUnique(knowledge: Knowledge[], key: keyof Knowledge): string[] {
  const set = new Set<string>();
  knowledge.forEach((k) => {
    const v = k[key];
    if (v && typeof v === "string") set.add(v);
  });
  return Array.from(set).sort();
}

/** データのユニーク値にデフォルトを足し、重複なく返す（key の重複を防ぐ） */
function uniqueWithDefaults(
  knowledge: Knowledge[],
  key: keyof Knowledge,
  defaults: string[]
): string[] {
  const set = new Set(getUnique(knowledge, key));
  defaults.forEach((d) => set.add(d));
  return Array.from(set).sort();
}

function getNextId(knowledge: Knowledge[]): string {
  let max = 0;
  knowledge.forEach((k) => {
    const m = /^K(\d+)$/.exec(k.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `K${String(max + 1).padStart(2, "0")}`;
}

const emptyKnowledge = (id: string): Knowledge => ({
  id,
  title: "",
  viewpoint: VIEWPOINTS[0] ?? "⑤絶対注意（ミス防止）",
  content: "",
  product: "共通",
  timeline: "共通",
  client: "共通",
  flow: "",
  domain: "",
  source: "",
});

interface AddKnowledgeFormProps {
  knowledge: Knowledge[];
  onSubmit: (k: Knowledge) => void;
}

export function AddKnowledgeForm({ knowledge, onSubmit }: AddKnowledgeFormProps) {
  const nextId = useMemo(() => getNextId(knowledge), [knowledge]);
  const [form, setForm] = useState<Knowledge>(() => emptyKnowledge(nextId));

  const products = useMemo(
    () => uniqueWithDefaults(knowledge, "product", ["共通", "充電器", "コンバータ"]),
    [knowledge]
  );
  const timelines = useMemo(
    () => uniqueWithDefaults(knowledge, "timeline", ["共通", "プレAS", "前後", "FS"]),
    [knowledge]
  );
  const clients = useMemo(
    () => uniqueWithDefaults(knowledge, "client", ["共通"]),
    [knowledge]
  );
  const flows = useMemo(() => getUnique(knowledge, "flow"), [knowledge]);
  const domains = useMemo(() => getUnique(knowledge, "domain"), [knowledge]);

  const handleChange = (key: keyof Knowledge, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const newId = getNextId(knowledge);
    const newItem = { ...form, id: newId };
    onSubmit(newItem);
    setForm(emptyKnowledge(getNextId([...knowledge, newItem])));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl space-y-5 rounded-xl border border-slate-700/80 bg-slate-800/60 p-6 backdrop-blur"
    >
      <h2 className="text-lg font-semibold text-slate-100">ナレッジを追加</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">タイトル *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          placeholder="例: 電圧レンジ確認は仕様書と図面の両方で行う"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">観点</label>
        <select
          value={form.viewpoint}
          onChange={(e) => handleChange("viewpoint", e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
        >
          {VIEWPOINTS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">本文</label>
        <textarea
          value={form.content}
          onChange={(e) => handleChange("content", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          placeholder="ナレッジの内容を記述"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">製品</label>
          <select
            value={form.product}
            onChange={(e) => handleChange("product", e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          >
            {products.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">時間軸</label>
          <select
            value={form.timeline}
            onChange={(e) => handleChange("timeline", e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          >
            {timelines.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">顧客</label>
        <select
          value={form.client}
          onChange={(e) => handleChange("client", e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
        >
          {clients.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">業務フロー</label>
          <select
            value={form.flow}
            onChange={(e) => handleChange("flow", e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">未選択</option>
            {flows.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">ドメイン</label>
          <select
            value={form.domain}
            onChange={(e) => handleChange("domain", e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">未選択</option>
            {domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">抽出元</label>
        <input
          type="text"
          value={form.source}
          onChange={(e) => handleChange("source", e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          placeholder="例: 会議A"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => setForm(emptyKnowledge(getNextId(knowledge)))}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          クリア
        </button>
        <button
          type="submit"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
        >
          追加する
        </button>
      </div>
    </form>
  );
}
