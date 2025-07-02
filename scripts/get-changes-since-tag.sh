#!/usr/bin/env bash

# Get repository info
REPO_INFO=$(gh repo view --json owner,name)
OWNER=$(echo "$REPO_INFO" | jq -r '.owner.login')
REPO=$(echo "$REPO_INFO" | jq -r '.name')

# Get latest tag
LATEST_TAG=$(git tag --sort=-version:refname | head -1)
echo "Latest tag: $LATEST_TAG"
echo "Repository: $OWNER/$REPO"
echo ""

# Get commits since latest tag
git log --format='%H' "$LATEST_TAG..HEAD" | while read -r sha; do
    # Get commit details separately to handle multiline messages properly
    subject=$(git log --format='%s' -n 1 "$sha")
    body=$(git log --format='%b' -n 1 "$sha")
    author_name=$(git log --format='%an' -n 1 "$sha")
    author_email=$(git log --format='%ae' -n 1 "$sha")
    
    echo "Commit: $sha"
    echo "Subject: $subject"
    if [[ -n "$body" && "$body" != " " ]]; then
        echo "Body:"
        echo "$body" | sed 's/^/  /'
    fi
    echo "Author: $author_name <$author_email>"
    
    # Get GitHub username
    github_user=$(gh api "repos/$OWNER/$REPO/commits/$sha" --jq '.author.login // empty' 2>/dev/null)
    
    # Try noreply email parsing if API didn't return username
    if [[ -z "$github_user" && "$author_email" =~ ^[0-9]+\+([^@]+)@users\.noreply\.github\.com$ ]]; then
        github_user="${BASH_REMATCH[1]}"
    elif [[ -z "$github_user" && "$author_email" =~ ^([^@]+)@users\.noreply\.github\.com$ ]]; then
        github_user="${BASH_REMATCH[1]}"
    fi
    
    # Extract PR number from subject
    pr_number=""
    if [[ "$subject" =~ \(#([0-9]+)\) ]]; then
        pr_number="${BASH_REMATCH[1]}"
    fi
    
    echo "GitHub User: ${github_user:-<unresolved>}"
    echo "PR Number: ${pr_number:-<none>}"
    echo "---"
done