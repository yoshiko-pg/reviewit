# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Untracked file detection with CLI prompt (#6)
- --host option to configure server bind address (#13)
- Comprehensive CLI and server integration tests (#27)

### Changed

- UI misc
  - Remove comment badges from directories in left pane
  - Visual feedback for file path copy button
  - Visible border on top of file header in right pane
  - Directory path collapsing in left pane

### Fixed

- Diff display issue when non-default git diff tool is set (#24)
- Server URL to reflect --host option (#25)
- Remove unnecessary default value in help (#22)
- Mode option now working

### Thanks

- [@umiyosh](https://github.com/umiyosh) for fixing diff display issue #24
- [@mitsuru](https://github.com/mitsuru) for fixing server URL to reflect --host option #25
- [@no-yan](https://github.com/no-yan) for adding untracked file detection with CLI prompt #6
- [@yicrotkd](https://github.com/yicrotkd) for adding --host option to configure server bind address #13
- [@kawarimidoll](https://github.com/kawarimidoll) for removing unnecessary default value in help #22

## [1.1.9] - 2025-07-02

### Added

- Customizable appearance settings to Web UI with font size, font family, theme selection, and syntax highlighting options (#16)

### Changed

- Skip browser auto-launch when no differences are found, displaying informative CLI message instead

### Fixed

- Comment areas now use full width in inline mode for improved readability

## [1.1.8] - 2025-07-01

### Fixed

- Fixed port fallback behavior to prevent displaying `localhost:undefined` when the initial port is in use

### Thanks

- [@arayaryoma](https://github.com/arayaryoma) for fixing port fallback behavior #15

## [1.1.7] - 2025-07-01

### Added

- Scala syntax highlighting support

### Fixed

- Fixed error when specifying a specific commit hash that prevented the application from starting
  - Now correctly validates commit formats like `abc123^` and `abc123~1`
  - Resolves "Invalid base commit-ish format" error when using commit^ syntax

### Thanks

- [@rfkm](https://github.com/rfkm) for adding Scala syntax highlighting support #14

## [1.1.6] - 2025-07-01

### Added

- GitHub PR URL support with `--pr <url>` option
  - `npx reviewit --pr https://github.com/owner/repo/pull/123`

### Changed

- README.md features section simplified for better readability

### Fixed

- Fixed error when using `working` as target argument that was incorrectly causing validation failures

## [1.1.5] - 2025-07-01

### Added

- MIT License
- Line-type specific comment positioning
  - Delete lines: comments positioned on left half
  - Add lines: comments positioned on right half
  - Unchanged lines: comments positioned full width

### Changed

- Comment display format simplified to file:line (removed timestamp)

## [1.1.4] - 2025-07-01

### Fixed

- Fix frontend display to correctly split on three dots (...) instead of two dots (..)
- Fix git diff arguments to use resolvedCommit string instead of individual commitish values

## [1.1.3] - 2025-07-01

### Changed

- Git commit comparison now uses three dots (...) instead of two dots (..) for better range comparison

### Fixed

- Node.js requirement updated to 21+ with ES2022 support
  - fixed: https://github.com/yoshiko-pg/reviewit/issues/10

## [1.1.2] - 2025-07-01

### Added

- Comment export feature on process termination (#9)
- /release command for automated release workflow
- CI workflow for pull requests

### Changed

- Package dependencies updated
- Improved lint configuration
- Enhanced pre-commit hooks setup

## [1.1.1] - 2025-06-30

### Added

- Compare-with option support

### Thanks

- [@unvalley](https://github.com/unvalley) for removing undefined `staging` option documentation #7
- [@yu7400ki](https://github.com/yu7400ki) for improving build scripts in package.json #3

## [1.1.0] - 2025-06-30

### Added

- TUI (Terminal User Interface) mode

### Thanks

- [@mizchi](https://github.com/mizchi) for TUI implementation #2

## [1.0.8] - 2025-06-30

### Added

- Dynamic syntax highlighting for additional languages - bash, ruby, java, php, sql

## [1.0.7] - 2025-06-30

### Fixed

- Use version from package.json

### Thanks

- [@no-yan](https://github.com/no-yan) for version handling improvement #1

## [1.0.6] - 2025-06-30

### Added

- Automatic server shutdown when browser tab is closed

## [1.0.5] - 2025-06-30

### Added

- `.` argument to show HEAD vs working directory diff

## [1.0.4] - 2025-06-30

### Changed

- Show commit hash range in short format

## [1.0.3] - 2025-06-30

### Changed

- Simplify comment prompt format to file:line format

### Fixed

- Fix folder name truncation in file tree

## [1.0.2] - 2025-06-30

### Changed

- Use custom favicon

## [1.0.1] - 2025-06-30

### Changed

- Auto-collapse lock files by default

## [1.0.0] - 2025-06-30

### Added

- First stable release 🌱

[Unreleased]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.8...HEAD
[1.1.8]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.7...v1.1.8
[1.1.7]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.6...v1.1.7
[1.1.6]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/yoshiko-pg/reviewit/compare/v1.0.8...v1.1.0
[1.0.8]: https://github.com/yoshiko-pg/reviewit/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/yoshiko-pg/reviewit/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/yoshiko-pg/reviewit/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/yoshiko-pg/reviewit/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/yoshiko-pg/reviewit/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/yoshiko-pg/reviewit/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/yoshiko-pg/reviewit/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/yoshiko-pg/reviewit/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/yoshiko-pg/reviewit/releases/tag/v1.0.0
