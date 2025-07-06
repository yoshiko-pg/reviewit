# セキュリティレビュー: 任意コード実行の脆弱性

## 概要

reviewitコードベースの任意コード実行に関するセキュリティレビューを実施しました。
`exec`、`execSync`などの危険な可能性のあるパターンを調査した結果、全体的にセキュアな実装となっていますが、いくつか改善可能な点を発見しました。

## 発見した問題

### 1. 🔴 高リスク: getBlobContent()でのファイルパス検証不足

**ファイル**: `src/server/git-diff.ts` (229行目, 236行目)

```typescript
// Line 229: stagedファイルの処理
const buffer = execSync(`git show :${filepath}`, {
  maxBuffer: 10 * 1024 * 1024,
});

// Line 236: 通常のgitオブジェクトの処理
const blobHash = execSync(`git rev-parse "${ref}:${filepath}"`, { encoding: 'utf8' }).trim();
```

**問題点**:

- `filepath`パラメータが直接シェルコマンドに渡されている
- パスに特殊文字（`;`、`|`、`&`など）が含まれる場合、コマンドインジェクションの可能性

**推奨される修正**:

```typescript
// ファイルパスのサニタイゼーション
function sanitizeFilePath(filepath: string): string {
  // シェルメタ文字をエスケープ
  return filepath.replace(/[;&|`$(){}[\]<>'"\\]/g, '\\$&');
}

// または、child_processのexecFileSync()を使用
import { execFileSync } from 'child_process';
const buffer = execFileSync('git', ['show', `:${filepath}`], {
  maxBuffer: 10 * 1024 * 1024,
});
```

### 2. 🟡 中リスク: execSyncの使用箇所

**ファイル**: `src/cli/utils.ts`

以下の3箇所でexecSyncを使用していますが、すべて適切に実装されています：

1. **getGitHubToken()** (93行目)
   - 固定コマンド `gh auth token` のみ実行
   - ユーザー入力なし
   - **リスク**: なし

2. **resolveCommitInLocalRepo()** (138行目, 143行目, 144行目)
   - SHA値は`validateCommitish()`で検証済み
   - gitコマンドのみ実行
   - **リスク**: 低（検証済み）

## 良好なセキュリティプラクティス

### 1. 入力検証

- `validateCommitish()`関数による包括的な入力検証
- 正規表現パターンによる厳密な形式チェック
- 特殊文字を含む危険な入力の拒否

### 2. GitHub PR URLの検証

- URLオブジェクトを使用した安全なパース
- ホスト名の検証（github.comのみ許可）
- パス構造の厳密なチェック

### 3. リソース制限

- ファイルサイズ制限（10MB）によるDoS攻撃の防止
- 適切なエラーハンドリング

### 4. 危険なパターンの不使用

- `eval()`の使用なし
- `Function()`コンストラクタの使用なし
- 動的`require()`の使用なし

## 推奨事項

### 優先度: 高

1. **getBlobContent()のファイルパス検証**
   - ファイルパスのサニタイゼーション実装
   - または`execFileSync()`への移行

### 優先度: 中

2. **gitライブラリの活用**
   - 可能な限り`simple-git`ライブラリのメソッドを使用
   - 直接的なシェルコマンド実行を最小化

### 優先度: 低

3. **追加のセキュリティ対策**
   - レート制限の実装（GitHub API呼び出し）
   - より詳細なログ記録
   - セキュリティヘッダーの追加（Webサーバー使用時）

## まとめ

全体的にセキュアな実装となっていますが、`getBlobContent()`関数のファイルパス処理に改善の余地があります。
この点を修正することで、より堅牢なセキュリティを実現できます。
