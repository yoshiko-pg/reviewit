Update CHANGELOG.md with all changes from the latest tag to current commit.
The categories are as follows:
- `Added` for new features.
- `Changed` for changes in existing functionality.
- `Deprecated` for soon-to-be removed features.
- `Removed` for now removed features.
- `Fixed` for any bug fixes.
- `Security` in case of vulnerabilities.

Then inform the user in Japanese about the added content and ask for confirmation.
If confirmed OK:
- npm version --no-git-tag-version patch
- Create a version section in CHANGELOG.md and move Unreleased section content there
- Commit CHANGELOG.md
- create current version git tag
- git push origin main --tags
Then ask the user to run npm publish. (Do not execute npm publish yourself)