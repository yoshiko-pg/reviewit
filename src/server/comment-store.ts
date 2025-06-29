import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { Comment } from '../types/diff.js';

export class CommentStore {
  private sessionId: string;
  private filePath: string;
  private comments: Map<string, Comment> = new Map();

  constructor(sessionId?: string) {
    this.sessionId = sessionId || Date.now().toString();
    this.filePath = join(process.cwd(), '.reviewit', `tmp-comments-${this.sessionId}.json`);
  }

  async addComment(file: string, line: number, body: string): Promise<Comment> {
    const comment: Comment = {
      id: `${file}:${line}:${Date.now()}`,
      file,
      line,
      body,
      timestamp: new Date().toISOString(),
    };

    this.comments.set(comment.id, comment);
    await this.saveToFile();

    return comment;
  }

  async getComments(): Promise<Comment[]> {
    return Array.from(this.comments.values());
  }

  async getCommentsForFile(file: string): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter((c) => c.file === file);
  }

  generatePrompt(comment: Comment, diffContent: string): string {
    const lines = diffContent.split('\n');

    // Find the relevant code context around the commented line
    let relevantLines: string[] = [];
    let foundTargetLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip chunk headers (start with @@)
      if (line.startsWith('@@')) continue;

      // Extract line numbers and content
      const addMatch = line.match(/^\+(\d+)/);
      const delMatch = line.match(/^-(\d+)/);
      const normalMatch = line.match(/^ /);

      if (addMatch || delMatch || normalMatch) {
        const lineNumber = addMatch
          ? parseInt(addMatch[1])
          : delMatch
            ? parseInt(delMatch[1])
            : null;

        // Include lines around the target line (±5 lines context)
        if (lineNumber && Math.abs(lineNumber - comment.line) <= 5) {
          relevantLines.push(line);
          if (lineNumber === comment.line) {
            foundTargetLine = true;
          }
        } else if (!lineNumber && relevantLines.length > 0 && relevantLines.length < 15) {
          // Include context lines without line numbers if we're building context
          relevantLines.push(line);
        }
      }
    }

    // If we didn't find the exact line, include more general context
    if (!foundTargetLine && relevantLines.length === 0) {
      const contextStart = Math.max(0, comment.line - 5);
      const contextEnd = Math.min(lines.length, comment.line + 5);
      relevantLines = lines.slice(contextStart, contextEnd);
    }

    const codeContext = relevantLines.join('\n');

    return [
      `File: ${comment.file}`,
      `Line: ${comment.line}`,
      '',
      'Code Context:',
      '```',
      codeContext,
      '```',
      '',
      `Comment: ${comment.body}`,
    ].join('\n');
  }

  generateAllCommentsPrompt(comments: Comment[], diffFiles: any[]): string {
    if (comments.length === 0) {
      return 'No comments available.';
    }

    const prompts = comments.map((comment, index) => {
      const targetFile = diffFiles.find((f: any) => f.path === comment.file);
      if (!targetFile) {
        return [
          `## Comment ${index + 1}`,
          `File: ${comment.file}`,
          `Line: ${comment.line}`,
          '',
          'Code Context:',
          '```',
          'File not found in diff',
          '```',
          '',
          `Comment: ${comment.body}`,
        ].join('\n');
      }

      let diffContent = '';
      for (const chunk of targetFile.chunks) {
        diffContent += chunk.header + '\n';
        for (const line of chunk.lines) {
          const prefix = line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' ';
          diffContent += prefix + line.content + '\n';
        }
      }

      const individualPrompt = this.generatePrompt(comment, diffContent);
      return [`## Comment ${index + 1}`, individualPrompt].join('\n');
    });

    return [
      `All Code Review Comments (${comments.length} total)`,
      '='.repeat(50),
      '',
      ...prompts,
    ].join('\n\n');
  }

  private async saveToFile(): Promise<void> {
    try {
      await fs.mkdir(dirname(this.filePath), { recursive: true });
      const data = JSON.stringify(Array.from(this.comments.values()), null, 2);
      await fs.writeFile(this.filePath, data, 'utf8');
    } catch (error) {
      console.error('Failed to save comments:', error);
    }
  }

  async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const comments: Comment[] = JSON.parse(data);
      this.comments.clear();
      comments.forEach((comment) => {
        this.comments.set(comment.id, comment);
      });
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
    }
  }
}
