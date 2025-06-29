#!/bin/bash

# Auto-commit script for reviewit project
# Usage: ./scripts/commit.sh "commit message"

set -e

# Check if commit message is provided
if [ $# -eq 0 ]; then
    echo "Error: Please provide a commit message"
    echo "Usage: ./scripts/commit.sh \"commit message\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "📝 Adding all changes to staging area..."
git add .

echo "🚀 Committing with message: $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "✅ Commit completed successfully!"