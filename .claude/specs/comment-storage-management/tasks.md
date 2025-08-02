# Implementation Plan

- [x] 1. Storage Service Implementation
  - Create StorageService class to abstract localStorage access
  - Implement data save/load functionality per diff context
  - Implement storage key generation logic (including dynamic reference normalization)
  - _Requirements: 1.1, 1.4, 3.1, 3.2_

- [x] 2. Data Model and Utility Functions Implementation
  - [x] 2.1 Add type definitions for DiffComment, ViewedFileRecord, DiffContextStorage
    - Define new interfaces in types/diff.ts
    - Consider compatibility with existing Comment interface
    - _Requirements: 1.4, 4.1, 4.4_

  - [x] 2.2 Implement commit reference normalization function
    - Create normalizeCommitish function
    - Add branch name to commit hash resolution functionality
    - _Requirements: 3.1_

  - [x] 2.3 Implement diff content hash generation function
    - SHA-256 hash generation using Web Crypto API
    - Include fallback implementation
    - _Requirements: 2.2_

- [x] 3. Comment Management Hook Implementation
  - [x] 3.1 Create new useDiffComments hook
    - Save/load comments considering diff context
    - Comment CRUD operations (Create, Read, Update, Delete)
    - Implement prompt generation functionality
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 Implement parallel operation with existing useLocalComments hook
    - Support both old and new data formats
    - Enable gradual migration
    - _Requirements: 3.4_

- [x] 4. Viewed State Management Implementation
  - [x] 4.1 Create useViewedFiles hook
    - Save/load Viewed state per diff context
    - Calculate and save file diff content hash
    - _Requirements: 2.1, 2.2_

  - [x] 4.2 Implement diff content change detection functionality
    - Compare saved hash with current diff content
    - Reset Viewed state when content changes
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 5. UI Component Updates
  - [x] 5.1 Modify App.tsx
    - Integrate new hooks
    - Pass appropriate information from DiffResponse
    - _Requirements: 1.2, 2.1_

  - [x] 5.2 Update DiffViewer component
    - Include side information when creating comments
    - Retrieve and save chunk header information
    - _Requirements: 1.4, 4.1_

  - [x] 5.3 Update CommentButton and InlineComment
    - Support new data structure
    - Display and handle side information
    - _Requirements: 1.2, 4.2_

- [x] 6. Error Handling and Data Management
  - [x] 6.1 Implement storage capacity monitoring
    - Calculate usage capacity
    - Display warning when capacity exceeded
    - _Requirements: 3.3_

  - [x] 6.2 Implement old data cleanup functionality
    - Delete data older than specified days
    - Cleanup with user confirmation
    - _Requirements: 3.3_

- [ ] 7. Test Implementation
  - [ ] 7.1 Create unit tests
    - StorageService tests
    - Normalization function tests
    - Hash generation tests
    - _Requirements: General_

  - [ ] 7.2 Create hook integration tests
    - useDiffComments tests
    - useViewedFiles tests
    - Data persistence verification
    - _Requirements: General_

  - [ ] 7.3 Update UI component tests
    - Verify operation with new data structure
    - Edge case tests
    - _Requirements: General_