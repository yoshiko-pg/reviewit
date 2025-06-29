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
    const contextStart = Math.max(0, comment.line - 3);
    const contextEnd = Math.min(lines.length, comment.line + 3);
    const context = lines.slice(contextStart, contextEnd + 1).join('\n');

    return [
      `📄 ${comment.file} L${comment.line}`,
      '----',
      context,
      '----',
      `Comment: "${comment.body}"`,
    ].join('\n');
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
