# Requirements Document

## Overview

This feature improves the comment and viewed state management system in the WebUI, properly separating data based on the displayed diff range. Currently, the data structure doesn't consider specific diff contexts (base commit and target commit), causing comments from different diffs to appear in wrong places. This enhancement implements a more robust data structure that saves comments and viewed states with awareness of the complete diff context.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to save comments with their specific diff context, so that comments from one diff range don't appear when viewing another diff range.

#### Acceptance Criteria

1. When a user adds a comment to a diff view, the system must save the comment with both baseCommitish and targetCommitish identifiers
2. When a user views a diff between specific base and target commits, the system must display only comments created for that exact diff range
3. Given comments created for diff A→B, the system must not display them when showing diff C→D
4. When saving a comment, the system must include the complete diff context (baseCommitish, targetCommitish, file path, line number)

### Requirement 2

**User Story:** As a developer, I want to persist the state of file Viewed buttons, so that when I reopen the same diff, I can maintain my previous review state.

#### Acceptance Criteria

1. When a user clicks the Viewed button to mark a file as reviewed, the system must save that state with the diff context
2. When saving the Viewed state, the system must also store a hash of the file's diff content
3. When redisplaying the same diff range, the system must compare the saved hash with the current diff content
4. If the diff content is the same, the system must restore the previous Viewed state
5. If the diff content has changed, the system must reset the Viewed state and display as unviewed

### Requirement 3

**User Story:** As a developer, I want comments and viewed data to be efficiently organized in localStorage, so that performance remains good even with many diffs.

#### Acceptance Criteria

1. When storing data, the system must use a hierarchical key structure that includes baseCommitish and targetCommitish
2. When querying data, the system must load only data relevant to the current diff range
3. If localStorage approaches its limit, the system must provide a way to clean up old data
4. When migrating from old data structures, the system must attempt to preserve existing comments where possible

### Requirement 4

**User Story:** As a developer, I want to see the specific code range I'm commenting on, so that comments remain accurate even when line numbers change.

#### Acceptance Criteria

1. When saving a comment, the system must capture the chunk header information
2. When displaying a comment, the system must show the original code context
3. If line numbers have shifted, the system must still attempt to display the comment near the relevant code
4. When a comment references a code range, the system must save both old and new line numbers from the diff