# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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

[Unreleased]: https://github.com/yoshiko-pg/reviewit/compare/v1.1.3...HEAD
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
