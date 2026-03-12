-- 関係テーブルにエビデンス・確信度・承認状態・サイレント承認用カラムを追加
ALTER TABLE relations
  ADD COLUMN IF NOT EXISTS evidence_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS confidence_score real DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS auto_approve_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN relations.evidence_text IS '推論根拠（なぜこの2つが繋がるか・1行）';
COMMENT ON COLUMN relations.confidence_score IS '関係性の確信度 0-1。0.9以上でサイレント承認対象';
COMMENT ON COLUMN relations.status IS 'pending | approved | rejected | silent_approved | changed';
COMMENT ON COLUMN relations.auto_approve_at IS 'サイレント承認予定日時。過ぎたら silent_approved に更新';

-- 関係性フィードバックログ（NG理由・変更内容。評価エージェント移行用）
CREATE TABLE IF NOT EXISTS relation_feedback_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id text NOT NULL,
  to_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'changed')),
  previous_type text,
  new_type text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relation_feedback_logs_from_to ON relation_feedback_logs(from_id, to_id);
CREATE INDEX IF NOT EXISTS idx_relation_feedback_logs_created_at ON relation_feedback_logs(created_at);
