import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { getFileExtension } from '../utils/fileUtils.js';

import { GitDiffParser } from './git-diff.js';

interface ServerOptions {
  targetCommitish: string;
  baseCommitish: string;
  preferredPort?: number;
  host?: string;
  openBrowser?: boolean;
  mode?: string;
  ignoreWhitespace?: boolean;
}

export async function startServer(
  options: ServerOptions
): Promise<{ port: number; url: string; isEmpty?: boolean; server?: any }> {
  const app = express();
  const parser = new GitDiffParser();

  let diffData: any = null;
  let currentIgnoreWhitespace = options.ignoreWhitespace || false;
  const diffMode = options.mode || 'side-by-side';

  app.use(express.json());
  app.use(express.text()); // For sendBeacon text/plain requests

  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  const isValidCommit = await parser.validateCommit(options.targetCommitish);
  if (!isValidCommit) {
    throw new Error(`Invalid or non-existent commit: ${options.targetCommitish}`);
  }

  diffData = await parser.parseDiff(
    options.targetCommitish,
    options.baseCommitish,
    currentIgnoreWhitespace
  );

  app.get('/api/diff', async (req, res) => {
    const ignoreWhitespace = req.query.ignoreWhitespace === 'true';

    if (ignoreWhitespace !== currentIgnoreWhitespace) {
      currentIgnoreWhitespace = ignoreWhitespace;
      diffData = await parser.parseDiff(
        options.targetCommitish,
        options.baseCommitish,
        ignoreWhitespace
      );
    }

    res.json({
      ...diffData,
      ignoreWhitespace,
      mode: diffMode,
      baseCommitish: options.baseCommitish,
      targetCommitish: options.targetCommitish,
    });
  });

  app.get(/^\/api\/blob\/(.*)$/, async (req: any, res: any) => {
    try {
      const filepath = req.params[0];
      const ref = (req.query.ref as string) || 'HEAD';

      const blob = await parser.getBlobContent(filepath, ref);

      // Determine content type based on file extension
      const ext = getFileExtension(filepath);
      const contentTypes: { [key: string]: string } = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        bmp: 'image/bmp',
        svg: 'image/svg+xml',
        webp: 'image/webp',
        ico: 'image/x-icon',
        tiff: 'image/tiff',
        tif: 'image/tiff',
        avif: 'image/avif',
        heic: 'image/heic',
        heif: 'image/heif',
      };

      const contentType = contentTypes[ext || ''] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(blob);
    } catch (error) {
      console.error('Error fetching blob:', error);
      res.status(404).json({ error: 'File not found' });
    }
  });

  // Store comments for final output
  let finalComments: any[] = [];

  app.post('/api/comments', (req, res) => {
    try {
      // Handle both JSON and text/plain content types (sendBeacon sends as text/plain)
      let comments = [];
      if (req.headers['content-type']?.includes('application/json')) {
        comments = req.body.comments || [];
      } else if (typeof req.body === 'string') {
        const parsed = JSON.parse(req.body);
        comments = parsed.comments || [];
      } else {
        comments = req.body.comments || [];
      }
      finalComments = comments;
      res.json({ success: true });
    } catch (error) {
      console.error('Error parsing comments:', error);
      res.status(400).json({ error: 'Invalid comment data' });
    }
  });

  app.get('/api/comments-output', (_req, res) => {
    if (finalComments.length > 0) {
      const output = formatCommentsOutput(finalComments);
      res.send(output);
    } else {
      res.send('');
    }
  });

  // Function to format comments for output
  function formatCommentsOutput(comments: any[]): string {
    const prompts = comments.map((comment: any) => {
      return `${comment.file}:${Array.isArray(comment.line) ? `L${comment.line[0]}-L${comment.line[1]}` : `L${comment.line}`}\n${comment.body}`;
    });

    return [
      '\n📝 Comments from review session:',
      '='.repeat(50),
      prompts.join('\n=====\n'),
      '='.repeat(50),
      `Total comments: ${comments.length}\n`,
    ].join('\n');
  }

  // Function to output comments when server shuts down
  function outputFinalComments() {
    if (finalComments.length > 0) {
      console.log(formatCommentsOutput(finalComments));
    }
  }

  // SSE endpoint to detect when tab is closed
  app.get('/api/heartbeat', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial heartbeat
    res.write('data: connected\n\n');

    // Send heartbeat every 5 seconds
    const heartbeatInterval = setInterval(() => {
      res.write('data: heartbeat\n\n');
    }, 5000);

    // When client disconnects (tab closed, navigation, etc.)
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      console.log('Client disconnected, shutting down server...');
      outputFinalComments();
      process.exit(0);
    });
  });

  // Always runs in production mode when distributed as a CLI tool
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.NODE_ENV !== 'development';

  if (isProduction) {
    // Find client files relative to the CLI executable location
    const distPath = join(__dirname, '..', 'client');
    app.use(express.static(distPath));

    app.get('/{*splat}', (_req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>difit - Dev Mode</title>
          </head>
          <body>
            <div id="root"></div>
            <script>
              console.log('difit development mode');
              console.log('Diff data available at /api/diff');
            </script>
          </body>
        </html>
      `);
    });
  }

  const { port, url, server } = await startServerWithFallback(
    app,
    options.preferredPort || 3000,
    options.host || '127.0.0.1'
  );

  // Security warning for non-localhost binding
  if (options.host && options.host !== '127.0.0.1' && options.host !== 'localhost') {
    console.warn('\n⚠️  WARNING: Server is accessible from external network!');
    console.warn(`   Binding to: ${options.host}:${port}`);
    console.warn('   Make sure this is intended and your network is secure.\n');
  }

  // Check if diff is empty and skip browser opening
  if (diffData.isEmpty) {
    // Don't open browser if no differences found
  } else if (options.openBrowser) {
    try {
      await open(url);
    } catch {
      console.warn('Failed to open browser automatically');
    }
  }

  return { port, url, isEmpty: diffData.isEmpty, server };
}

async function startServerWithFallback(
  app: any,
  preferredPort: number,
  host: string
): Promise<{ port: number; url: string; server: any }> {
  return new Promise((resolve, reject) => {
    // express's listen() method uses listen() method in node:net Server instance internally
    // https://expressjs.com/en/5x/api.html#app.listen
    // so, an error will be an instance of NodeJS.ErrnoException
    const server = app.listen(preferredPort, host, (err: NodeJS.ErrnoException | undefined) => {
      const displayHost = host === '0.0.0.0' ? 'localhost' : host;
      const url = `http://${displayHost}:${preferredPort}`;
      if (!err) {
        resolve({ port: preferredPort, url, server });
        return;
      }

      // Handling errors when failed to launch a server
      switch (err.code) {
        // Try another port until it succeeds
        case 'EADDRINUSE': {
          console.log(`Port ${preferredPort} is busy, trying ${preferredPort + 1}...`);
          return startServerWithFallback(app, preferredPort + 1, host)
            .then(({ port, url, server }) => {
              resolve({ port, url, server });
            })
            .catch(reject);
        }
        // Unexpected error
        default: {
          reject(new Error(`Failed to launch a server: ${err.message}`));
        }
      }
    });
  });
}
