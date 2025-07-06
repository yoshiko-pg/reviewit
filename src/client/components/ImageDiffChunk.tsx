import { type DiffFile } from '../../types/diff';

interface ImageDiffChunkProps {
  file: DiffFile;
  mode?: 'side-by-side' | 'inline';
  baseCommitish?: string;
  targetCommitish?: string;
}

export function ImageDiffChunk({
  file,
  mode = 'inline',
  baseCommitish,
  targetCommitish,
}: ImageDiffChunkProps) {
  const isDeleted = file.status === 'deleted';
  const isAdded = file.status === 'added';
  const isModified = file.status === 'modified' || file.status === 'renamed';

  // Determine the actual refs to use
  const baseRef = baseCommitish || 'HEAD~1';
  const targetRef = targetCommitish || 'HEAD';

  // For deleted files, show only the old version
  if (isDeleted) {
    return (
      <div className="bg-github-bg-primary p-4">
        <div className="text-center">
          <div className="mb-2">
            <span className="text-github-danger font-medium">Deleted Image</span>
          </div>
          <div className="inline-block border border-github-border rounded-md p-4 bg-github-bg-secondary">
            <div className="text-github-text-muted mb-2">Previous version:</div>
            <img
              src={`/api/blob/${file.oldPath || file.path}?ref=${baseRef}`}
              alt={`Previous version of ${file.oldPath || file.path}`}
              className="max-w-full max-h-96 border border-github-border rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden text-github-text-muted text-sm mt-2">
              Image could not be loaded
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For added files, show only the new version
  if (isAdded) {
    return (
      <div className="bg-github-bg-primary p-4">
        <div className="text-center">
          <div className="mb-2">
            <span className="text-github-accent font-medium">Added Image</span>
          </div>
          <div className="inline-block border border-github-border rounded-md p-4 bg-github-bg-secondary">
            <div className="text-github-text-muted mb-2">New file:</div>
            <img
              src={`/api/blob/${file.path}?ref=${targetRef}`}
              alt={`New image ${file.path}`}
              className="max-w-full max-h-96 border border-github-border rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden text-github-text-muted text-sm mt-2">
              Image could not be loaded
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For modified/renamed files, show both versions
  if (isModified) {
    if (mode === 'side-by-side') {
      return (
        <div className="bg-github-bg-primary p-4">
          <div className="text-center mb-4">
            <span className="text-github-text-primary font-medium">Modified Image</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Old version */}
            <div className="text-center">
              <div className="border border-github-border rounded-md p-4 bg-github-bg-secondary">
                <div className="text-github-text-muted mb-2">Previous version:</div>
                <img
                  src={`/api/blob/${file.oldPath || file.path}?ref=${baseRef}`}
                  alt={`Previous version of ${file.oldPath || file.path}`}
                  className="max-w-full max-h-96 border border-github-border rounded mx-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden text-github-text-muted text-sm mt-2">
                  Image could not be loaded
                </div>
              </div>
            </div>

            {/* New version */}
            <div className="text-center">
              <div className="border border-github-border rounded-md p-4 bg-github-bg-secondary">
                <div className="text-github-text-muted mb-2">Current version:</div>
                <img
                  src={`/api/blob/${file.path}?ref=${targetRef}`}
                  alt={`Current version of ${file.path}`}
                  className="max-w-full max-h-96 border border-github-border rounded mx-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden text-github-text-muted text-sm mt-2">
                  Image could not be loaded
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Inline mode: stack vertically
      return (
        <div className="bg-github-bg-primary p-4">
          <div className="text-center mb-4">
            <span className="text-github-text-primary font-medium">Modified Image</span>
          </div>
          <div className="space-y-6">
            {/* Old version */}
            <div className="text-center">
              <div className="border border-github-border rounded-md p-4 bg-github-bg-secondary inline-block">
                <div className="text-github-text-muted mb-2">Previous version:</div>
                <img
                  src={`/api/blob/${file.oldPath || file.path}?ref=${baseRef}`}
                  alt={`Previous version of ${file.oldPath || file.path}`}
                  className="max-w-full max-h-96 border border-github-border rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden text-github-text-muted text-sm mt-2">
                  Image could not be loaded
                </div>
              </div>
            </div>

            {/* New version */}
            <div className="text-center">
              <div className="border border-github-border rounded-md p-4 bg-github-bg-secondary inline-block">
                <div className="text-github-text-muted mb-2">Current version:</div>
                <img
                  src={`/api/blob/${file.path}?ref=${targetRef}`}
                  alt={`Current version of ${file.path}`}
                  className="max-w-full max-h-96 border border-github-border rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden text-github-text-muted text-sm mt-2">
                  Image could not be loaded
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}
