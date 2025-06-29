import express from 'express';
import { join } from 'path';
import open from 'open';
import { GitDiffParser } from './git-diff.js';
import { CommentStore } from './comment-store.js';

interface ServerOptions {
  commitish: string;
  preferredPort?: number;
  openBrowser?: boolean;
  mode?: string;
}

export async function startServer(options: ServerOptions): Promise<{ port: number; url: string }> {
  const app = express();
  const parser = new GitDiffParser();
  const commentStore = new CommentStore();

  let diffData: any = null;

  app.use(express.json());

  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  const isValidCommit = await parser.validateCommit(options.commitish);
  if (!isValidCommit) {
    throw new Error(`Invalid or non-existent commit: ${options.commitish}`);
  }

  diffData = await parser.parseDiff(options.commitish);
  await commentStore.loadFromFile();

  app.get('/api/diff', (_req, res) => {
    res.json(diffData);
  });

  app.get('/api/comments', async (_req, res) => {
    const comments = await commentStore.getComments();
    res.json(comments);
  });

  app.post('/api/comments', async (req, res) => {
    try {
      const { file, line, body } = req.body;

      if (!file || typeof line !== 'number' || !body) {
        return res.status(400).json({ error: 'Missing required fields: file, line, body' });
      }

      const comment = await commentStore.addComment(file, line, body);
      res.json(comment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save comment' });
    }
  });

  app.post('/api/comments/:id/prompt', async (req, res) => {
    try {
      const comments = await commentStore.getComments();
      const comment = comments.find((c) => c.id === req.params.id);

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const targetFile = diffData.files.find((f: any) => f.path === comment.file);
      if (!targetFile) {
        return res.status(404).json({ error: 'File not found in diff' });
      }

      let diffContent = '';
      for (const chunk of targetFile.chunks) {
        diffContent += chunk.header + '\n';
        for (const line of chunk.lines) {
          const prefix = line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' ';
          diffContent += prefix + line.content + '\n';
        }
      }

      const prompt = commentStore.generatePrompt(comment, diffContent);
      res.json({ prompt });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate prompt' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distPath = join(process.cwd(), 'dist', 'client');
    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ReviewIt - Dev Mode</title>
          </head>
          <body>
            <div id="root"></div>
            <script>
              console.log('ReviewIt development mode');
              console.log('Diff data available at /api/diff');
            </script>
          </body>
        </html>
      `);
    });
  }

  const port = await findAvailablePort(options.preferredPort || 3000);
  app.listen(port, '127.0.0.1');

  const url = `http://localhost:${port}`;

  if (options.openBrowser) {
    try {
      await open(url);
    } catch (error) {
      console.warn('Failed to open browser automatically');
    }
  }

  return { port, url };
}

async function findAvailablePort(preferredPort: number): Promise<number> {
  const net = await import('net');

  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(preferredPort, () => {
      const port = (server.address() as any)?.port;
      server.close(() => resolve(port));
    });

    server.on('error', () => {
      findAvailablePort(preferredPort + 1)
        .then(resolve)
        .catch(reject);
    });
  });
}
