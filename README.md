# ReviewIt 🔍

A lightweight command-line tool that spins up a local web server to display Git commit diffs in a GitHub-like Files changed view. Perfect for code review workflows without leaving the terminal! 🚀

## ✨ Features

- 🌙 **GitHub-like UI**: Familiar dark theme file list and diff interface
- 💬 **Inline Comments**: Add comments to specific lines and generate Claude Code prompts
- 🔄 **Side-by-Side & Inline Views**: Choose your preferred diff viewing mode
- ⚡ **Zero Config**: Just run `npx reviewit <commit>` and it works
- 🔐 **Local Only**: Never exposes data over network - runs on localhost only
- 🛠️ **Modern Stack**: React 18 + TypeScript + Tailwind CSS

## 📦 Installation

```bash
# Global install
npm install -g reviewit

# Or use npx (no installation needed)
npx reviewit <commit-ish>
```

## 🚀 Usage

```bash
# Review a specific commit
reviewit 6f4a9b7

# Review HEAD~3
reviewit HEAD~3

# Custom port, don't auto-open browser
reviewit 6f4a9b7 --port 4300 --no-open

# Via npx
npx reviewit main~1
```

### ⚙️ CLI Options

| Flag           | Default    | Description                                  |
| -------------- | ---------- | -------------------------------------------- |
| `<commit-ish>` | (required) | Any Git reference: hash, tag, HEAD~n, branch |
| `--port`       | auto       | Preferred port; falls back if occupied       |
| `--no-open`    | false      | Don't automatically open browser             |
| `--mode`       | inline     | Diff mode: `inline` or `side-by-side`        |

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Start development server (with hot reload)
# This runs both Vite dev server and CLI with NODE_ENV=development
pnpm run dev                    # defaults to HEAD
pnpm run dev HEAD~3            # review HEAD~3
pnpm run dev main              # review main branch

# For development CLI only (connects to separate Vite server)
pnpm run dev:cli <commit-ish>

# Build and start production server
pnpm run start HEAD

# Build for production
pnpm run build

# Run tests
pnpm test

# Lint and format
pnpm run lint
pnpm run format
pnpm run typecheck
```

### Development Workflow

- **`pnpm run dev`**: Starts both Vite dev server (with hot reload) and CLI server simultaneously
- **`pnpm run start <commit>`**: Builds everything and starts production server (for testing final build)
- **Development mode**: Uses Vite's dev server for hot reload and fast development
- **Production mode**: Serves built static files (used by npx and production builds)

## 💬 Comment System

ReviewIt includes an inline commenting system that integrates with Claude Code:

1. **Add Comments**: Click on any diff line to add a comment
2. **Edit Comments**: Edit existing comments with the edit button
3. **Generate Prompts**: Comments include a "Copy Prompt" button that formats the context for Claude Code
4. **Copy All**: Use "Copy All Prompt" to copy all comments in a structured format
5. **Persistent Storage**: Comments are saved in browser localStorage per commit

### Comment Prompt Format

```
File: src/components/Button.tsx
Line: 42
Comment: This function name should probably be more specific
```

## 🏗️ Architecture

- **CLI**: Commander.js for argument parsing
- **Backend**: Express server with simple-git for diff processing
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 with GitHub-like dark theme
- **Testing**: Vitest for unit tests
- **Quality**: ESLint, Prettier, lefthook pre-commit hooks

## 📋 Requirements

- Node.js ≥ 18.0.0
- Git repository with commits to review

## 📄 License

MIT 📝
