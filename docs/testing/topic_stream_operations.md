# Topic Stream Operations Test Plan

This document outlines the test cases for topic stream operations in the TrendPulse Dashboard application.

## Prerequisites

- Backend API server is running on `http://localhost:8000`
- Frontend server is running on `http://localhost:3000`
- User is authenticated in the application

## Test Cases

### 1. Creating Topic Streams

#### 1.1 Form Validation Tests

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-1.1.1 | Empty query validation | 1. Click "New Stream"<br>2. Leave the query field empty<br>3. Try to submit the form | Form shows error "Query is required" | - |
| TC-1.1.2 | Short query validation | 1. Click "New Stream"<br>2. Enter a 2-character query<br>3. Try to submit the form | Form shows error "Query must be at least 3 characters" | - |
| TC-1.1.3 | Long query validation | 1. Click "New Stream"<br>2. Enter a query with more than 100 characters<br>3. Try to submit the form | Form shows error "Query must be less than 100 characters" | - |

#### 1.2 Creation Process Tests

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-1.2.1 | Successful topic stream creation | 1. Click "New Stream"<br>2. Fill valid data in all fields<br>3. Submit the form | - Form is submitted successfully<br>- New topic appears in the sidebar<br>- New topic is selected automatically | - |
| TC-1.2.2 | Server error handling | 1. Click "New Stream"<br>2. Fill valid data<br>3. Submit while server is down or returns error | Form shows error message | - |
| TC-1.2.3 | Default values test | 1. Click "New Stream"<br>2. Only fill the query field<br>3. Submit the form | Topic created with default values for other fields | - |

### 2. Deleting Topic Streams

#### 2.1 Deletion Process Tests

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-2.1.1 | Delete confirmation dialog | 1. Select a topic stream<br>2. Click "Delete" button | Confirmation dialog appears | - |
| TC-2.1.2 | Cancel deletion | 1. Trigger delete confirmation<br>2. Click "Cancel" | Dialog closes, no changes made | - |
| TC-2.1.3 | Confirm deletion | 1. Trigger delete confirmation<br>2. Click "Delete" | - Topic stream is removed<br>- Sidebar list is updated<br>- Another stream is selected if available | - |

#### 2.2 Error Handling Tests

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-2.2.1 | Delete during loading state | 1. Select a topic stream<br>2. Click "Delete" while data is still loading | - Operation is postponed until loading completes<br>- No UI glitches | - |
| TC-2.2.2 | Server error on delete | 1. Select a topic stream<br>2. Click "Delete"<br>3. Confirm deletion while server is down | - Error message is displayed<br>- Topic stream remains in the list | - |

### 3. Loading and Display Tests

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-3.1 | Loading state display | 1. Open dashboard | "Loading streams..." appears while fetching data | - |
| TC-3.2 | Empty state display | 1. Open dashboard with no streams | "No topic streams yet..." message is shown | - |
| TC-3.3 | Selected stream display | 1. Have multiple streams<br>2. Select different streams | - Selected stream is highlighted<br>- Details panel shows selected stream info | - |
| TC-3.4 | Stream selection after deletion | 1. Have multiple streams<br>2. Select a stream<br>3. Delete the selected stream | Another stream is automatically selected | - |

### 4. Error Recovery Tests

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-4.1 | API timeout recovery | 1. Create a situation where API times out<br>2. Allow retries to occur | Automatic retries with backoff attempt to recover | - |
| TC-4.2 | Authorization token expiry | 1. Create a situation with expired token<br>2. Perform operation | User is redirected to login page | - |
| TC-4.3 | Error message dismissal | 1. Create an error situation<br>2. Click the "×" on error message | Error message is dismissed | - |

### 5. Markdown Rendering Tests

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-5.1 | Basic markdown elements | 1. Create a topic stream<br>2. View summary with markdown | Headers, lists, bold, italic, and links properly rendered | - |
| TC-5.2 | Code blocks | 1. View summary with code blocks<br>2. Check formatting | Code blocks properly formatted with syntax highlighting | - |
| TC-5.3 | Tables | 1. View summary with tables<br>2. Check layout | Tables properly rendered with column alignment | - |
| TC-5.4 | Citations | 1. View summary with citations<br>2. Check source links | Sources displayed as clickable links with proper formatting | - |
| TC-5.5 | Blockquotes | 1. View summary with blockquotes<br>2. Check formatting | Blockquotes visually distinguished with proper indentation | - |
| TC-5.6 | Images | 1. View summary with image links<br>2. Check rendering | Images properly displayed with alt text | - |
| TC-5.7 | Mixed content | 1. View summary with mixed markdown elements<br>2. Check layout | All elements correctly rendered with proper spacing | - |
| TC-5.8 | Malformed markdown | 1. Create situation with malformed markdown<br>2. View rendering | Graceful handling of malformed markdown | - |

## Planned Automated Tests

The following tests should be implemented as unit or integration tests:

1. Form validation tests
2. API call retry logic
3. Error handling for all operations
4. Stream deletion workflow

## Notes

- Mock API responses should be used for automated tests
- API error simulation can be done using a proxy like MSW
- Visual regression tests are recommended for UI components 