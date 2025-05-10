# API Integration Test Plan

This document outlines the test cases for Perplexity API integration in the TrendPulse Dashboard application.

## Prerequisites

- Backend API server is running on `http://localhost:8000`
- Environment variables properly configured with valid Perplexity API key
- Database properly initialized

## Test Cases

### 1. Basic API Connectivity

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-1.1 | Verify API connection | 1. Send a basic query to Perplexity API<br>2. Check response | Successful response with 200 status code | - |
| TC-1.2 | API key validation | 1. Temporarily use invalid API key<br>2. Send query | Error response with appropriate error code (401) | - |
| TC-1.3 | API throttling handling | 1. Send multiple rapid requests<br>2. Observe rate limit behavior | Rate limits are respected with proper backoff strategy | - |

### 2. Query Parameter Testing

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-2.1 | Model selection - sonar | 1. Send query with sonar model<br>2. Check response | Appropriate response for sonar model | - |
| TC-2.2 | Model selection - sonar-pro | 1. Send query with sonar-pro model<br>2. Check response | Enhanced response with sonar-pro capabilities | - |
| TC-2.3 | Recency filter - day | 1. Send query with day filter<br>2. Check results | Results only from past 24 hours | - |
| TC-2.4 | Recency filter - week | 1. Send query with week filter<br>2. Check results | Results from past week | - |
| TC-2.5 | Detail level parameter mapping | 1. Test each detail level setting<br>2. Verify max_tokens mapping | Correct max_tokens values for each detail level | - |

### 3. Response Processing

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-3.1 | Summary extraction | 1. Get API response<br>2. Process summary content | Summary correctly extracted and formatted | - |
| TC-3.2 | Citation extraction | 1. Get API response<br>2. Extract citations | Citations properly parsed and stored | - |
| TC-3.3 | Malformed response handling | 1. Mock malformed API response<br>2. Process response | Graceful error handling without app crash | - |
| TC-3.4 | Markdown formatting | 1. Get API response<br>2. Check markdown processing | Markdown properly rendered in summary | - |

### 4. Error Handling

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-4.1 | API timeout | 1. Configure timeout<br>2. Trigger slow response<br>3. Observe behavior | Proper timeout handling with user feedback | - |
| TC-4.2 | Network failure | 1. Simulate network disconnect<br>2. Send query<br>3. Observe recovery | Graceful error with retry mechanism | - |
| TC-4.3 | API error response | 1. Trigger API error (e.g., bad request)<br>2. Process response | Error properly logged and reported to user | - |
| TC-4.4 | Empty result handling | 1. Send query with no results<br>2. Process response | Appropriate message shown to user | - |

### 5. Integration with Topic Streams

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-5.1 | Initial stream creation | 1. Create new topic stream<br>2. Check API call | Correct query parameters sent to API | - |
| TC-5.2 | Scheduled updates | 1. Configure update frequency<br>2. Wait for scheduled update<br>3. Check API call | Scheduled call made with correct parameters | - |
| TC-5.3 | Deep dive integration | 1. Create topic stream<br>2. Send follow-up query<br>3. Check API call | Chat history and context correctly maintained | - |

## Planned Automated Tests

The following tests should be implemented as unit or integration tests:

1. API client unit tests
2. Mock response processing
3. Error handling for various API scenarios
4. Parameter mapping validation

## Notes

- Use mocked responses for automated testing to avoid API costs
- Test with real API periodically to ensure compatibility
- Monitor rate limits during testing
- Consider implementing a test toggle for using real vs mock API 