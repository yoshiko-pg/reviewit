reviewit — Requirements

1. Purpose

Create a lightweight command‑line tool that spins up a local web server to display the diff of a specified Git commit in a GitHub‑like Files changed view. The tool is intended for developers to review changes quickly without leaving the terminal environment or pushing code to a remote repo.

2. Objectives
	•	Zero‑config UX: npx reviewit <commit-ish> should “just work”.
	•	Familiar UI: Match GitHub’s visual hierarchy (file list ➜ collapsible per‑file diff, line numbers, colored highlights).
	•	Local‑only: Never expose data over the network; listen on localhost and auto‑open the default browser.
	•	Extensible roadmap: Allow future enhancements such as side‑by‑side view, image diff, and performance optimisations without breaking the CLI contract.

3. Scope

In‑Scope (MVP – Phase 1)

ID	Requirement
F‑1	Accept a single commit-ish (hash, tag, or branch) as the only CLI argument.
F‑2	Execute git diff <commit-ish>^ <commit-ish> using simple‑git and parse output into structured JSON.
F‑3	Serve a React SPA (Vite dev‑build) on an ephemeral port; open http://localhost:<port> automatically.
F‑4	Render inline (unified) diff per file with expand/collapse.
F‑5	Highlight additions (+) and deletions (–) with GitHub‑style colors.
NF‑1	Support Node.js ≥ 18 (ESM).
NF‑2	Use CSS Modules for styling; no global CSS or Tailwind.
NF‑3	Keep runtime dependencies minimal (< 20 MB install footprint).

Out‑of‑Scope (MVP)
	•	Side‑by‑side diff.
	•	Binary / image diff rendering.
	•	Commit navigation UI (graph, branch list, etc.).
	•	Desktop packaging (Electron).

4. Roadmap & Milestones

Phase	Features	Target Outcome
1 (MVP)	Items F‑1 – F‑5, NF‑1 – NF‑3	Basic local diff viewer, inline mode only.
2	• Side‑by‑side diff toggle• Image & binary diff (PNG/JPG thumbnail with size/orientation change indicators)• Virtualised list & viewport rendering for >5 000‑line diffs	Feature parity with GitHub for most repos; handles large diffs smoothly.
3	• Syntax highlighting via shiki• Dark/light theme switcher• Branch/tag selector & commit history sidebar• Diff view options (hide whitespace, split view defaults)	Polished UX for daily code‑review workflows.

5. Technical Stack

Layer	Library / Tool	Notes
CLI	commander or yargs	Parse args; provide --port, --open=false.
Git Access	simple‑git	Thin wrapper over native Git; avoids spawning extra processes on each request.
Server	Express + Vite static middleware	Serves API endpoint /api/diff & SPA assets.
Front‑end	React 18 + TypeScript + Vite	Fast dev iteration.
Diff Rendering	react-diff-viewer (inline) → later migrate/fork for side‑by‑side & image support.	
Styling	CSS Modules + PostCSS autoprefixer.	
Testing	Vitest for unit tests; Playwright for e2e UI diff snapshots.	

6. CLI Specification

# Inline diff (default)
$ reviewit 6f4a9b7

# Custom port, don’t auto‑open browser
$ reviewit 6f4a9b7 --port 4300 --open=false

# Via npx (no global install)
$ npx reviewit HEAD~3

Flag	Default	Description
<commit-ish>	(required)	Any reference understood by Git: hash, tag, HEAD~n, branch.
--port	auto	Preferred port; falls back to random if occupied.
--open	true	Automatically open default browser when server is ready.
--mode	inline	Placeholder for future side-by-side.

7. Data Flow & Architecture
	1.	CLI Entrypoint parses args; starts Express server.
	2.	Server executes simple‑git once, transforming unified diff to JSON (file path, additions, deletions, hunks, line numbers).
	3.	JSON is cached in memory for the session.
	4.	React SPA fetches /api/diff and renders list ➜ diff components.

+-------------+    HTTP    +-------------------+
|  React SPA  | <--------> |  Express + Diff   |
+-------------+           +-------------------+
                               |  simple‑git  |
                               +--------------+

8. Performance & Scalability (Future‑proofing)
	•	Lazy load diff hunks when user expands a file.
	•	Virtualised list rendering (e.g., react‑window) for very large diffs.
	•	Memoise syntax‑highlight tokens.

9. Security Considerations
	•	Bind server to 127.0.0.1 only.
	•	No CORS, no external calls.
	•	Validate commit-ish input to prevent command injection.

10. Installation & Development

# Local dev
pnpm install
pnpm dev   # runs Vite + nodemon

# Global install for daily use
npm install -g reviewit

11. Risks & Mitigations

Risk	Mitigation
Large binary files in diff break JSON size	Detect binary; send metadata only & offer download link.
Node version drift	CI matrix 18, 20; compile to ES2020.
Dependency bloat	Track install size in CI; fail if >20 MB.

12. Glossary
	•	Diff: Line‑by‑line textual difference between two file revisions.
	•	Commit‑ish: Any Git reference resolving to a commit (hash, tag, branch, HEAD~n).

⸻

Document version 1 — 2025‑06‑29

6. Inline Commenting (MVP v0.2)

Goal: Enable line‑level comments in the diff view and make it easy for the user to pass each comment to an already running Claude code session manually.

Scope
	•	Comment UI: A 💬 icon appears when the cursor hovers over a diff line. Clicking it opens an inline textarea.
	•	Submit behaviour:
	1.	The comment is stored in a temporary JSON file located at .reviewit/tmp-comments-<session>.json (one file per server run).

{
  "file": "src/foo.ts",
  "line": 42,
  "body": "export の綴り違くない？",
  "timestamp": "2025-06-29T12:34:56Z"
}


	2.	The UI renders the comment bubble and shows a “Copy prompt” button.
	3.	Pressing the button copies a ready‑formatted prompt to the clipboard, e.g.:

📄 src/foo.ts L42
----
+ const foo = "bar";
----
コメント: 「export の綴り違くない？」

The user can paste this text into their existing Claude code terminal.

	•	No automatic process control: reviewit does not spawn nor attach to Claude code in v0.2.

Future Enhancements
	•	One‑click pipe: send the prompt directly to Claude code via child‑process wrapper.
	•	Stream Claude responses back into the comment thread in real time.
	•	Persist comments in git notes or a dedicated repo folder for later retrieval.