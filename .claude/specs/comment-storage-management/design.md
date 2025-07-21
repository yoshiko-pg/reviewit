# 設計書

## 概要

この設計書は、difitのWebUIにおけるコメントとViewed状態の管理システムを改善するための技術設計を記載します。現在の実装では、コメントがコミットハッシュのみで管理されているため、異なる差分範囲（baseCommitish→targetCommitish）でコメントが混在する問題があります。本設計では、差分コンテキスト全体を考慮した新しいデータ構造と、ファイルのViewed状態の永続化機能を実装します。

## アーキテクチャ

### データストレージ階層

```
localStorage
└── difit-storage-v1/
    └── {baseCommitish}-{targetCommitish}/
        ├── comments: Comment[]
        └── viewedFiles: ViewedFileRecord[]
```

### 主要な変更点

1. **統合されたストレージ構造**: 差分コンテキストごとにコメントとViewed状態を一緒に管理
2. **バージョニング**: 将来のスキーマ変更に対応するため、ストレージキーにバージョンを含める（v1から開始）
3. **差分内容の検証**: Viewed状態の妥当性を確認するため、ファイルの差分内容のハッシュ値を保存
4. **マイグレーション不要**: 新しい構造として開始し、既存データの移行は行わない

## コンポーネントと インターフェース

### 1. データモデル

```typescript
// コメントのデータ構造（ゼロベースで設計）
interface DiffComment {
  id: string;  // UUID形式を推奨
  filePath: string;
  body: string;
  createdAt: string;  // ISO 8601形式
  updatedAt: string;  // ISO 8601形式
  
  // チャンク情報
  chunkHeader: string;  // 例: "@@ -10,7 +10,8 @@ function example()"
  
  // コメントの位置情報
  position: {
    side: 'old' | 'new';  // 削除側(-)か追加側(+)か
    line: number | { start: number; end: number };  // 単一行またはレンジ
  };
  
  // コメント時点のコード内容（オプション）
  codeSnapshot?: {
    content: string;
    language?: string;  // ファイル拡張子から推測
  };
}

// Viewed状態の記録
interface ViewedFileRecord {
  filePath: string;
  viewedAt: string;  // ISO 8601形式
  diffContentHash: string;  // SHA-256ハッシュ
}

// ストレージのルート構造
interface DiffContextStorage {
  version: 1;  // スキーマバージョン
  baseCommitish: string;
  targetCommitish: string;
  createdAt: string;  // ISO 8601形式
  lastModifiedAt: string;  // ISO 8601形式
  
  comments: DiffComment[];
  viewedFiles: ViewedFileRecord[];
}
```

### 2. ストレージサービス

```typescript
interface StorageService {
  // 統合されたデータ取得・保存
  getDiffContextData(baseCommitish: string, targetCommitish: string): DiffContextStorage;
  saveDiffContextData(baseCommitish: string, targetCommitish: string, data: DiffContextStorage): void;
  
  // コメント関連
  getComments(baseCommitish: string, targetCommitish: string): DiffComment[];
  saveComments(baseCommitish: string, targetCommitish: string, comments: DiffComment[]): void;
  
  // Viewed状態関連
  getViewedFiles(baseCommitish: string, targetCommitish: string): ViewedFileRecord[];
  saveViewedFiles(baseCommitish: string, targetCommitish: string, files: ViewedFileRecord[]): void;
  
  // ユーティリティ
  cleanupOldData(daysToKeep: number): void;
  getStorageSize(): number;
}
```

### 3. フック

```typescript
// コメント追加時のパラメータ
interface AddCommentParams {
  filePath: string;
  body: string;
  side: 'old' | 'new';
  line: number | { start: number; end: number };
  chunkHeader: string;
  codeSnapshot?: DiffComment['codeSnapshot'];
}

// 新しいコメント管理フック
interface UseDiffCommentsReturn {
  comments: DiffComment[];
  addComment: (params: AddCommentParams) => DiffComment;
  removeComment: (commentId: string) => void;
  updateComment: (commentId: string, newBody: string) => void;
  clearAllComments: () => void;
  generatePrompt: (commentId: string) => string;
  generateAllCommentsPrompt: () => string;
}

// Viewed状態管理フック
interface UseViewedFilesReturn {
  viewedFiles: Set<string>;  // ファイルパスのSet
  toggleFileViewed: (filePath: string, diffFile: DiffFile) => void;
  isFileContentChanged: (filePath: string) => boolean;
  getViewedFileRecord: (filePath: string) => ViewedFileRecord | undefined;
  clearViewedFiles: () => void;
}
```

## データモデル

### ストレージキーの生成

```typescript
function generateStorageKey(baseCommitish: string, targetCommitish: string): string {
  // フルコミットハッシュまたは参照名をそのまま使用
  // 特殊文字をエンコードしてファイルシステムセーフな形式に
  const encode = (str: string) => str.replace(/[^a-zA-Z0-9-_]/g, (char) => {
    return `_${char.charCodeAt(0).toString(16)}_`;
  });
  
  return `${encode(baseCommitish)}-${encode(targetCommitish)}`;
}

// 例:
// generateStorageKey("main", "feature/add-auth")
// => "main-feature_2f_add_2d_auth"
// generateStorageKey("abc1234", "def5678")  
// => "abc1234-def5678"
```

### 差分内容のハッシュ生成

```typescript
async function generateDiffHash(diffContent: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(diffContent);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

## エラーハンドリング

### ストレージエラー

1. **容量超過**: localStorageの容量制限（通常5-10MB）に達した場合
   - 古いデータの自動削除を提案
   - ユーザーに通知

2. **データ破損**: JSON パースエラーが発生した場合
   - 破損したデータをバックアップ
   - 新しい構造で初期化

3. **マイグレーションエラー**: V1からV2への移行時のエラー
   - 元のデータを保持
   - エラーログを記録

### ハッシュ計算エラー

- Web Crypto APIが利用できない場合は、簡易的なハッシュ関数にフォールバック
- ハッシュ計算に失敗した場合は、Viewed状態を保存しない

## テスト戦略

### ユニットテスト

1. **ストレージサービス**
   - キー生成の正確性
   - データの保存と読み込み
   - マイグレーション処理
   - エラーハンドリング

2. **フック**
   - コメントのCRUD操作
   - Viewed状態の管理
   - 差分内容の変更検出

3. **ハッシュ生成**
   - 同一内容で同じハッシュ
   - 異なる内容で異なるハッシュ
   - エッジケース（空文字、大きなファイル）

### 統合テスト

1. **データ永続性**
   - ページリロード後のデータ復元
   - 異なる差分コンテキストでのデータ分離

2. **マイグレーション**
   - V1データの正常な移行
   - 移行後の動作確認

3. **パフォーマンス**
   - 大量のコメントでの動作
   - ストレージ容量の監視

## 実装の詳細

### 動的な参照の扱い

サーバーから受け取る `baseCommitish` と `targetCommitish` には以下のような値が来る可能性があります：

1. **コミットハッシュ**: `abc1234...` - そのまま使用
2. **ブランチ名**: `main`, `feature/auth` - コミットハッシュに解決
3. **HEAD**: 現在のコミットハッシュに解決
4. **作業ディレクトリ**: `.` または `working` - 特別な扱いが必要
5. **ステージ**: `staged` - 特別な扱いが必要

```typescript
// 動的参照の正規化
function normalizeCommitish(
  commitish: string, 
  currentCommitHash: string,  // 現在のHEADのハッシュ
  branchToHash?: Map<string, string>  // ブランチ名→ハッシュのマッピング
): string {
  // 作業ディレクトリやステージの場合
  // baseにHEADハッシュ、targetに特別キーワードで一意性を保証
  if (commitish === '.' || commitish === 'working') {
    return 'WORKING';
  }
  if (commitish === 'staged') {
    return 'STAGED';
  }
  
  // HEADの場合は解決されたハッシュを使用
  if (commitish === 'HEAD') {
    return currentCommitHash;
  }
  
  // ブランチ名の場合はハッシュに解決
  if (branchToHash?.has(commitish)) {
    return branchToHash.get(commitish)!;
  }
  
  // コミットハッシュの場合はそのまま
  return commitish;
}

// ストレージキー生成の例
// difit staged の場合:
// base: 解決されたHEADのハッシュ (例: "abc1234")
// target: "STAGED"
// → キー: "difit-storage-v1/abc1234-STAGED"

// difit . の場合:
// base: 解決されたHEADのハッシュ (例: "abc1234")
// target: "WORKING"
// → キー: "difit-storage-v1/abc1234-WORKING"
```

### localStorageキーの構造

```typescript
// メインのストレージキー
const STORAGE_KEY_PREFIX = 'difit-storage-v1';

// 差分コンテキストごとのキー生成
function getStorageKey(
  baseCommitish: string, 
  targetCommitish: string,
  currentCommitHash: string,
  branchToHash?: Map<string, string>
): string {
  let normalizedBase: string;
  let normalizedTarget: string;
  
  // 特別なケースの処理
  if (targetCommitish === '.' || targetCommitish === 'working') {
    normalizedBase = currentCommitHash;
    normalizedTarget = 'WORKING';
  } else if (targetCommitish === 'staged') {
    normalizedBase = currentCommitHash;
    normalizedTarget = 'STAGED';
  } else {
    // 通常のケース
    normalizedBase = normalizeCommitish(baseCommitish, currentCommitHash, branchToHash);
    normalizedTarget = normalizeCommitish(targetCommitish, currentCommitHash, branchToHash);
  }
  
  const key = generateStorageKey(normalizedBase, normalizedTarget);
  return `${STORAGE_KEY_PREFIX}/${key}`;
}

// データの保存例
const storageKey = getStorageKey('HEAD~1', 'staged', 'abc1234def5678');
// → "difit-storage-v1/abc1234def5678-STAGED"

const data: DiffContextStorage = {
  version: 1,
  baseCommitish: 'HEAD~1',  // 元の値を保存（UI表示用）
  targetCommitish: 'staged', // 元の値を保存（UI表示用）
  createdAt: new Date().toISOString(),
  lastModifiedAt: new Date().toISOString(),
  comments: [...],
  viewedFiles: [...]
};
localStorage.setItem(storageKey, JSON.stringify(data));
```

### 古いデータとの共存

- 既存の `difit-comments-${commitHash}` キーは残す（読み取り専用）
- 新しいデータは `difit-storage-v1/` 配下に保存
- 将来的に古いデータのクリーンアップ機能を追加可能