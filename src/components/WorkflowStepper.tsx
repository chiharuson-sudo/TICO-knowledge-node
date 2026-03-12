"use client";

export type WorkflowPhase = 1 | 2;

interface WorkflowStepperProps {
  currentPhase: WorkflowPhase;
  /** Phase 1 で未承認の件数 */
  pendingCount?: number;
  /** Phase 2 で関係性FB待ちの件数 */
  relationshipPendingCount?: number;
}

export function WorkflowStepper({
  currentPhase,
  pendingCount = 0,
  relationshipPendingCount = 0,
}: WorkflowStepperProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            currentPhase >= 1 ? "bg-cyan-600 text-white" : "bg-slate-600 text-slate-400"
          }`}
        >
          1
        </span>
        <div>
          <span className="text-sm font-medium text-slate-200">Phase 1: ナレッジ検証</span>
          <p className="text-xs text-slate-400">引用元と比較し、修正または承認</p>
          {pendingCount > 0 && (
            <span className="text-xs text-amber-400">未承認 {pendingCount} 件</span>
          )}
        </div>
      </div>
      <div className="h-px w-8 bg-slate-600" aria-hidden />
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            currentPhase >= 2 ? "bg-cyan-600 text-white" : "bg-slate-600 text-slate-400"
          }`}
        >
          2
        </span>
        <div>
          <span className="text-sm font-medium text-slate-200">Phase 2: 関係性定義</span>
          <p className="text-xs text-slate-400">承認済みナレッジの因果・前提・波及・対策を定義</p>
          {relationshipPendingCount > 0 && (
            <span className="text-xs text-cyan-400">FB待ち {relationshipPendingCount} 件</span>
          )}
        </div>
      </div>
    </div>
  );
}
