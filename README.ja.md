<h1 align="center">
  <img src="public/logo.png" alt="difit" width="260">
</h1>

**difit**は、GitHubスタイルのdiffビューアをあなたのマシン上で起動するゼロコンフィグCLIツールです。「Files changed」レイアウトでコミットをレビューし、インラインコメントを追加して、それらのコメントをAIプロンプトとしてコピーできます。ターミナルを離れることなくコードレビューワークフローを実現！ 🚀

## ✨ 機能

- ⚡ **ゼロコンフィグ**: `npx difit <commit>`を実行するだけで動作
- 🌙 **AI向けレビュー**: コメントを追加してAIコーディングエージェント用のプロンプトをコピー
- 🖥️ **ターミナルUI**: `--tui`でターミナル内でdiffを直接表示

## ⚡ クイックスタート

```bash
npx difit    # HEADコミットの変更を美しいdiffビューアで表示
```

## 🚀 使い方

### 基本的な使い方

```bash
npx difit <commit-ish>                # 単一コミットのdiffを表示
npx difit <commit-ish> [compare-with] # 2つのコミット/ブランチを比較
npx difit --pr <github-pr-url>        # GitHubプルリクエストをレビュー
```

### 単一コミットのレビュー

```bash
npx difit 6f4a9b7  # 特定のコミット
npx difit HEAD^    # 前のコミット
npx difit feature  # ブランチの最新コミット
```

### 2つのコミットを比較

```bash
npx difit HEAD main      # HEADとmainブランチを比較
npx difit feature main   # ブランチ間を比較
npx difit . origin/main  # 作業ディレクトリとリモートmainを比較
```

### 特別な引数

difitは一般的なdiffシナリオ用の特別なキーワードをサポートしています：

```bash
npx difit          # HEADコミットの変更
npx difit .        # すべての未コミット変更（ステージ済み + 未ステージ）
npx difit staged   # コミット準備済みのステージ変更
npx difit working  # 未ステージ変更のみ（compare-withは使用不可）
```

| キーワード | 説明                                                | compare-with サポート |
| ---------- | --------------------------------------------------- | --------------------- |
| `.`        | すべての未コミット変更を表示（ステージ済み＆未ステージ） | ✅ はい               |
| `staged`   | コミット準備済みのステージ変更を表示                   | ✅ はい               |
| `working`  | 作業ディレクトリの未ステージ変更を表示                 | ❌ いいえ             |

### GitHub PR

```bash
npx difit --pr https://github.com/owner/repo/pull/123
```

difitは以下の方法でGitHub認証を自動的に処理します：

1. **GitHub CLI**（推奨）：`gh auth login`でログイン済みの場合、既存の認証情報を使用
2. **環境変数**：`GITHUB_TOKEN`環境変数を設定
3. **認証なし**：パブリックリポジトリは認証なしで動作（レート制限あり）

#### GitHub Enterprise Server

difitはGitHub Enterprise Serverをサポートしています：

```bash
npx difit --pr https://github.enterprise.com/owner/repo/pull/456
```

**重要**：GitHub Enterprise Serverの場合、あなたのEnterprise Serverインスタンスで生成されたトークンを使用する必要があります：

1. `https://YOUR-ENTERPRISE-SERVER/settings/tokens`にアクセス
2. 適切なスコープでパーソナルアクセストークンを生成
3. `GITHUB_TOKEN`環境変数として設定

⚠️ **注意**：github.comのトークンはEnterpriseサーバーでは動作しません。各GitHubインスタンスには独自のトークンが必要です。

## ⚙️ CLIオプション

| フラグ           | デフォルト   | 説明                                                               |
| ---------------- | ------------ | ------------------------------------------------------------------ |
| `<commit-ish>`   | HEAD         | Gitリファレンス：ハッシュ、タグ、HEAD~n、ブランチ、または特別な引数 |
| `[compare-with]` | (オプション) | 比較対象の2番目のコミット（2つの間のdiffを表示）                    |
| `--pr <url>`     | -            | レビューするGitHub PRのURL（例：https://github.com/owner/repo/pull/123） |
| `--port`         | auto         | 優先ポート；使用中の場合はフォールバック                            |
| `--host`         | 127.0.0.1    | サーバーをバインドするホストアドレス（外部アクセスには0.0.0.0を使用） |
| `--no-open`      | false        | ブラウザを自動的に開かない                                          |
| `--mode`         | side-by-side | Diffモード：`inline`または`side-by-side`                           |
| `--tui`          | false        | Webインターフェースの代わりにターミナルUIモードを使用               |
| `--clean`        | false        | 起動時にすべての既存コメントをクリア                                |

## 💬 コメントシステム

difitにはAIコーディングエージェントと統合されるインラインコメントシステムが含まれています：

1. **コメント追加**：diffの任意の行をクリックしてコメントを追加
2. **コメント編集**：編集ボタンで既存のコメントを編集
3. **プロンプト生成**：コメントには、AIコーディングエージェント用にコンテキストをフォーマットする「Copy Prompt」ボタンが含まれます
4. **すべてコピー**：「Copy All Prompt」を使用して、すべてのコメントを構造化された形式でコピー
5. **永続的な保存**：コメントはコミットごとにブラウザのlocalStorageに保存されます

### コメントプロンプトフォーマット

```sh
src/components/Button.tsx:42 # この行は自動的に追加されます
This name should probably be more specific.
```

## 🎨 シンタックスハイライト

difitは動的ロードによる複数のプログラミング言語のシンタックスハイライトをサポートしています：

### サポート言語

- **JavaScript/TypeScript**：`.js`、`.jsx`、`.ts`、`.tsx`
- **Web技術**：HTML、CSS、JSON、XML、Markdown
- **シェルスクリプト**：`.sh`、`.bash`、`.zsh`、`.fish`ファイル
- **バックエンド言語**：PHP、SQL、Ruby、Java、Scala
- **システム言語**：C、C++、C#、Rust、Go
- **モバイル言語**：Swift、Kotlin、Dart
- **その他**：Python、YAML、Solidity、Vimスクリプト

### 動的言語ロード

- パフォーマンス向上のため、言語はオンデマンドでロードされます
- ファイル拡張子から自動的に言語を検出
- サポートされていない言語はプレーンテキストにフォールバック
- 安全な依存関係の解決（例：PHPはmarkup-templatingが必要）

## 🛠️ 開発

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動（ホットリロード付き）
# これはViteの開発サーバーとCLIの両方をNODE_ENV=developmentで実行します
pnpm run dev

# プロダクションビルドとサーバーの起動
pnpm run start <commit-ish>

# プロダクション用ビルド
pnpm run build

# テストの実行
pnpm test

# リントとフォーマット
pnpm run lint
pnpm run format
pnpm run typecheck
```

### 開発ワークフロー

- **`pnpm run dev`**：Vite開発サーバー（ホットリロード付き）とCLIサーバーを同時に起動
- **`pnpm run start <commit-ish>`**：すべてをビルドしてプロダクションサーバーを起動（最終ビルドのテスト用）
- **開発モード**：ホットリロードと高速開発のためにViteの開発サーバーを使用
- **プロダクションモード**：ビルド済みの静的ファイルを提供（npxとプロダクションビルドで使用）

## 🏗️ アーキテクチャ

- **CLI**：包括的なバリデーションを備えたCommander.jsでの引数解析
- **バックエンド**：diff処理用のsimple-gitを備えたExpressサーバー
- **GitHub統合**：自動認証（GitHub CLI + 環境変数）を備えたOctokitでのGitHub API
- **フロントエンド**：React 18 + TypeScript + Vite
- **スタイリング**：GitHubライクなダークテーマを備えたTailwind CSS v4
- **シンタックスハイライト**：動的言語ロードを備えたPrism.js
- **テスト**：同じ場所に配置されたテストファイルを使用したVitestユニットテスト
- **品質**：ESLint、Prettier、lefthookプリコミットフック

## 📋 要件

- Node.js ≥ 21.0.0
- レビューするコミットを含むGitリポジトリ

## 📄 ライセンス

MIT 📝