import { DiffFile, Comment } from '../../types/diff';
import { useState } from 'react';
import { Checkbox } from './Checkbox';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FolderOpen,
  Folder,
  FilePlus,
  FileX,
  FilePen,
  Search,
  MessageCircle,
} from 'lucide-react';

interface FileListProps {
  files: DiffFile[];
  onScrollToFile: (path: string) => void;
  comments: Comment[];
  reviewedFiles: Set<string>;
  onToggleReviewed: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  file?: DiffFile;
}

function buildFileTree(files: DiffFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isDirectory: true, children: [] };

  files.forEach((file) => {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const pathSoFar = parts.slice(0, i + 1).join('/');

      if (!current.children) {
        current.children = [];
      }

      let child = current.children.find((c) => c.name === part);

      if (!child) {
        child = {
          name: part,
          path: pathSoFar,
          isDirectory: !isLast,
          children: isLast ? undefined : [],
          file: isLast ? file : undefined,
        };
        current.children.push(child);
      }

      current = child;
    }
  });

  return root;
}

export function FileList({
  files,
  onScrollToFile,
  comments,
  reviewedFiles,
  onToggleReviewed,
}: FileListProps) {
  const fileTree = buildFileTree(files);

  // Initialize with all directories expanded
  const getAllDirectoryPaths = (node: TreeNode): string[] => {
    if (!node.isDirectory || !node.children) return [];
    const paths: string[] = [];
    if (node.path) paths.push(node.path);
    node.children.forEach((child) => {
      paths.push(...getAllDirectoryPaths(child));
    });
    return paths;
  };

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    () => new Set(getAllDirectoryPaths(fileTree))
  );
  const [filterText, setFilterText] = useState('');

  const getCommentCount = (filePath: string) => {
    return comments.filter((c) => c.file === filePath).length;
  };

  // Filter the file tree based on search text
  const filterTreeNode = (node: TreeNode): TreeNode | null => {
    if (!filterText.trim()) return node;

    if (node.isDirectory && node.children) {
      const filteredChildren = node.children
        .map((child) => filterTreeNode(child))
        .filter((child) => child !== null) as TreeNode[];

      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    } else if (node.file) {
      // Check if file name matches filter
      if (node.file.path.toLowerCase().includes(filterText.toLowerCase())) {
        return node;
      }
      return null;
    }

    return null;
  };

  const filteredFileTree = filterTreeNode(fileTree) || { ...fileTree, children: [] };

  const getFileIcon = (status: DiffFile['status']) => {
    switch (status) {
      case 'added':
        return <FilePlus size={16} className="text-github-accent" />;
      case 'deleted':
        return <FileX size={16} className="text-github-danger" />;
      case 'renamed':
        return <FilePen size={16} className="text-github-warning" />;
      default:
        return <FileText size={16} className="text-github-text-secondary" />;
    }
  };

  const toggleDirectory = (path: string) => {
    setExpandedDirs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    if (node.isDirectory && node.children) {
      const isExpanded = expandedDirs.has(node.path);
      // Check if this directory or any subdirectory has comments
      const hasComments = (node: TreeNode): boolean => {
        if (node.file && getCommentCount(node.file.path) > 0) return true;
        if (node.children) {
          return node.children.some((child) => hasComments(child));
        }
        return false;
      };

      const dirHasComments = hasComments(node);

      return (
        <div key={node.path}>
          {node.name && (
            <div
              className="flex items-center gap-2 px-4 py-2 hover:bg-github-bg-tertiary cursor-pointer"
              style={{ paddingLeft: `${depth * 16 + 16}px` }}
              onClick={() => toggleDirectory(node.path)}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {isExpanded ? (
                <FolderOpen size={16} className="text-github-text-secondary" />
              ) : (
                <Folder size={16} className="text-github-text-secondary" />
              )}
              <span className="text-sm text-github-text-primary font-medium">{node.name}</span>
              {dirHasComments && (
                <span className="bg-github-warning/20 text-github-warning text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto flex items-center gap-1">
                  <MessageCircle size={12} />
                </span>
              )}
            </div>
          )}
          {(isExpanded || !node.name) &&
            node.children.map((child) => renderTreeNode(child, depth + 1))}
        </div>
      );
    } else if (node.file) {
      const commentCount = getCommentCount(node.file.path);
      const isReviewed = reviewedFiles.has(node.file.path);

      return (
        <div
          key={node.file.path}
          className={`flex items-center gap-2 px-4 py-2 hover:bg-github-bg-tertiary cursor-pointer transition-colors ${
            isReviewed ? 'opacity-70' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 16}px` }}
          onClick={() => onScrollToFile(node.file!.path)}
        >
          <Checkbox
            checked={isReviewed}
            onChange={() => {
              onToggleReviewed(node.file!.path);
            }}
            title={isReviewed ? 'Mark as not reviewed' : 'Mark as reviewed'}
            className="z-10"
          />
          {getFileIcon(node.file.status)}
          <span
            className={`text-sm text-github-text-primary flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${
              isReviewed ? 'line-through text-github-text-muted' : ''
            }`}
            title={node.file.path}
          >
            {node.name}
          </span>
          {commentCount > 0 && (
            <span className="bg-github-warning/20 text-github-warning text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto flex items-center gap-1">
              <MessageCircle size={12} />
              {commentCount}
            </span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-github-border bg-github-bg-tertiary">
        <h3 className="text-sm font-semibold text-github-text-primary m-0 mb-3">
          Files changed ({files.length})
        </h3>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-github-text-muted"
          />
          <input
            type="text"
            placeholder="Filter files..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-github-bg-primary border border-github-border rounded-md focus:outline-none focus:border-github-accent text-github-text-primary placeholder-github-text-muted"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredFileTree.children &&
          filteredFileTree.children.map((child) => renderTreeNode(child))}
      </div>
    </div>
  );
}
