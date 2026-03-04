# データ取込の全員共有（Supabase 設定）

一人がデータ取込すると、他のユーザーにもグラフの変更が反映されるようにするための設定です。

## 1. Supabase プロジェクト作成

1. [Supabase](https://supabase.com) にログイン
2. **New Project** でプロジェクトを作成
3. **Settings** → **API** で以下を控える:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. 環境変数

プロジェクトルートに `.env.local` を作成:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Vercel にデプロイする場合は、Vercel の **Settings** → **Environment Variables** で同じ変数を追加してください。

## 3. テーブル作成

Supabase の **SQL Editor** で以下を実行:

```sql
-- ナレッジテーブル
CREATE TABLE IF NOT EXISTS knowledge (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_key TEXT,
  viewpoint TEXT NOT NULL,
  content TEXT DEFAULT '',
  product TEXT DEFAULT '共通',
  timeline TEXT DEFAULT '共通',
  client TEXT DEFAULT '共通',
  flow TEXT DEFAULT '共通',
  domain TEXT DEFAULT '',
  source TEXT DEFAULT ''
);

-- 関係テーブル
CREATE TABLE IF NOT EXISTS relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '前提',
  description TEXT DEFAULT ''
);

-- 全員が読み書きできるようにする（社内利用を想定）
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for knowledge" ON knowledge FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for relations" ON relations FOR ALL USING (true) WITH CHECK (true);

-- Realtime を有効化（誰かが取込むと他ユーザーに即反映）
ALTER PUBLICATION supabase_realtime ADD TABLE knowledge;
ALTER PUBLICATION supabase_realtime ADD TABLE relations;
```

## 4. 動作

- **Supabase 未設定**: 従来どおりローカル状態のみ。取込はその端末だけに反映。
- **Supabase 設定後**:
  - 初回表示時に DB からナレッジ・関係を取得（データがあれば表示）
  - 「グラフに反映（全員に共有）」で DB に保存 → 他ユーザーは Realtime で自動更新
  - 他ユーザーが取込むと、開いている画面に数秒以内にグラフが更新される

## 5. トラブルシュート

| 現象 | 対処 |
|------|------|
| 反映後も他ユーザーに変わらない | Supabase の **Database** → **Replication** で `knowledge` / `relations` が有効か確認 |
| 「Supabase が未設定です」 | `.env.local` の変数名と値が正しいか確認。開発サーバーを再起動 |
| RLS で拒否される | 上記 POLICY が作成されているか確認 |
