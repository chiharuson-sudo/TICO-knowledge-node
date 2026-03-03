# GitHub + Vercel で公開する手順

みんなに公開するために、GitHub にコードを上げて Vercel で自動デプロイする手順です。

---

## 1. GitHub でリポジトリを作る

1. [GitHub](https://github.com) にログインする
2. 右上の **+** → **New repository**
3. 設定例：
   - **Repository name**: `knowledge-graph`（任意の名前でOK）
   - **Description**: 「ナレッジグラフ可視化アプリ」（任意）
   - **Public** を選択
   - **Add a README file** は付けない（ローカルに既にあるため）
4. **Create repository** をクリック

---

## 2. ローカルから GitHub にプッシュする

GitHub の作成後、画面に表示される「…or push an existing repository from the command line」のコマンドを使います。

**PowerShell でプロジェクトフォルダを開き、次を実行：**

```powershell
cd "c:\internship\豊田自動織機\ナレッジグラフ　ノード重視"

# リモートを追加（URL はあなたのリポジトリに書き換え）
git remote add origin https://github.com/あなたのユーザー名/knowledge-graph.git

# ブランチ名を main に
git branch -M main

# プッシュ
git push -u origin main
```

- `あなたのユーザー名` は GitHub のユーザー名
- リポジトリ名を変えた場合は `knowledge-graph` の部分も合わせて変更
- 初回プッシュで GitHub のログインを求められたら、ブラウザまたはトークンで認証

---

## 3. Vercel でデプロイする

1. [Vercel](https://vercel.com) にアクセス
2. **Sign Up** または **Log In**（**Continue with GitHub** がおすすめ）
3. ダッシュボードで **Add New…** → **Project**
4. **Import Git Repository** で、さきほどプッシュした **knowledge-graph** を選択
5. 設定：
   - **Framework Preset**: Next.js（自動検出されているはず）
   - **Root Directory**: そのまま（変更不要）
   - **Build Command**: `npm run build`（デフォルトのまま）
   - **Output Directory**: デフォルトのまま
6. **Deploy** をクリック
7. ビルドが終わると、**Congratulations!** とともに URL が表示されます（例: `https://knowledge-graph-xxxx.vercel.app`）

---

## 4. 今後の更新の流れ

コードを直したら、次のようにプッシュするだけで Vercel が自動で再デプロイします。

```powershell
cd "c:\internship\豊田自動織機\ナレッジグラフ　ノード重視"

git add .
git commit -m "変更内容のメモ"
git push
```

---

## トラブルシュート

| 現象 | 対処 |
|------|------|
| `git push` で認証エラー | GitHub で Personal Access Token を作成し、パスワードの代わりにトークンを入力 |
| Vercel のビルドが失敗する | Vercel のダッシュボード → 該当プロジェクト → **Deployments** → 失敗したデプロイの **Building** ログでエラー内容を確認 |
| 日本語フォントが表示されない | Vercel 側では Next.js の `next/font` で Noto Sans JP を読み込んでいるため、多くの場合はそのままで問題ありません。問題があれば Vercel の **Settings** → **Environment Variables** で必要な変数がないか確認 |

---

## リンク

- [Vercel ドキュメント（Git 連携）](https://vercel.com/docs/concepts/git)
- [GitHub でリポジトリを作成](https://docs.github.com/ja/repositories/creating-and-managing-repositories/creating-a-new-repository)
