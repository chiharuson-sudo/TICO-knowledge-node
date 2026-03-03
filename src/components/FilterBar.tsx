"use client";

import type { Knowledge, Filters } from "@/lib/types";

const AXES: { key: keyof Filters; label: string }[] = [
  { key: "product", label: "製品" },
  { key: "timeline", label: "時間軸" },
  { key: "client", label: "顧客" },
  { key: "flow", label: "業務フロー" },
  { key: "domain", label: "ドメイン" },
  { key: "viewpoint", label: "観点" },
];

interface FilterBarProps {
  knowledge: Knowledge[];
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string) => void;
}

function getUniqueValues(knowledge: Knowledge[], key: keyof Filters): string[] {
  const set = new Set<string>();
  knowledge.forEach((k) => {
    const v = k[key];
    if (v && typeof v === "string") set.add(v);
  });
  return ["全て", ...Array.from(set).sort()];
}

export function FilterBar({
  knowledge,
  filters,
  onFilterChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800/80 px-4 py-3 backdrop-blur">
      {AXES.map(({ key, label }) => {
        const values = getUniqueValues(knowledge, key);
        return (
          <div key={key} className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400">{label}</span>
            <div className="flex flex-wrap gap-1">
              {values.map((value) => {
                const isActive = filters[key] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onFilterChange(key, value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-cyan-500 text-slate-900"
                        : "bg-slate-700/80 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
