<div align="center">
  <img src="public/logo.png" alt="ReviewIt" width="400">
</div>

# ReviewIt 🔍

A lightweight command-line tool that spins up a local web server to display Git commit diffs in a GitHub-like Files changed view. Perfect for code review workflows without leaving the terminal! 🚀

## ✨ Features

- 🌙 **GitHub-like UI**: Familiar dark theme file list and diff interface
- 💬 **Inline Comments**: Add comments to specific lines and generate Claude Code prompts
- 🔄 **Side-by-Side & Inline Views**: Choose your preferred diff viewing mode
- 🖥️ **Terminal UI Mode**: View diffs directly in your terminal with `--tui` flag
- ⚡ **Zero Config**: Just run `npx reviewit <commit>` and it works
- 🔐 **Local Only**: Never exposes data over network - runs on localhost only
- 🛠️ **Modern Stack**: React 18 + TypeScript + Tailwind CSS
- 🎨 **Syntax Highlighting**: Dynamic language loading for Bash, PHP, SQL, Ruby, Java, and more
- ✨ **100% vibe coding**: Built with pure coding energy and good vibes

## 📦 Installation

```bash
# use npx (no installation needed)
npx reviewit <commit-ish>

# or Global install
npm install -g reviewit
```

## 🚀 Usage

```bash
# default: HEAD commit changes
npx reviewit

# Review a specific commit changes
npx reviewit 6f4a9b7
npx reviewit HEAD^
npx reviewit HEAD~3

# Special Arguments
npx reviewit staging  # staging area changes
npx reviewit working  # working directory changes
npx reviewit .        # uncommited all changes

# Custom port, don't auto-open browser
npx reviewit 6f4a9b7 --port 4300 --no-open

# Terminal UI mode (no browser)
npx reviewit --tui
npx reviewit working --tui
```

### ⚙️ CLI Options

| Flag           | Default      | Description                                                        |
| -------------- | ------------ | ------------------------------------------------------------------ |
| `<commit-ish>` | (required)   | Any Git reference: hash, tag, HEAD~n, branch, or Special Arguments |
| `--port`       | auto         | Preferred port; falls back if occupied                             |
| `--no-open`    | false        | Don't automatically open browser                                   |
| `--mode`       | side-by-side | Diff mode: `inline` or `side-by-side`                              |
| `--tui`        | false        | Use terminal UI mode instead of web interface                      |

### 🔑 Special Arguments

ReviewIt supports special arguments for common diff scenarios:

| Keyword   | Description                                            |
| --------- | ------------------------------------------------------ |
| `working` | Shows unstaged changes in your working directory       |
| `staged`  | Shows staged changes ready to be committed             |
| `.`       | Shows all uncommitted changes (both staged & unstaged) |

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

## 🎨 Syntax Highlighting

ReviewIt supports syntax highlighting for multiple programming languages with dynamic loading:

### Supported Languages

- **JavaScript/TypeScript**: `.js`, `.jsx`, `.ts`, `.tsx`
- **Web Technologies**: HTML, CSS, JSON, XML, Markdown
- **Shell Scripts**: `.sh`, `.bash`, `.zsh`, `.fish` files
- **Backend Languages**: PHP, SQL, Ruby, Java
- **Systems Languages**: C, C++, Rust, Go
- **Others**: Python, Swift, Kotlin, YAML

### Dynamic Language Loading

- Languages are loaded on-demand for better performance
- Automatic language detection from file extensions
- Fallback to plain text for unsupported languages
- Safe dependency resolution (e.g., PHP requires markup-templating)

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

## 🏗️ Architecture

- **CLI**: Commander.js for argument parsing
- **Backend**: Express server with simple-git for diff processing
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 with GitHub-like dark theme
- **Syntax Highlighting**: Prism.js with dynamic language loading
- **Testing**: Vitest for unit tests
- **Quality**: ESLint, Prettier, lefthook pre-commit hooks

## 📋 Requirements

- Node.js ≥ 18.0.0
- Git repository with commits to review

## 📄 License

MIT 📝
