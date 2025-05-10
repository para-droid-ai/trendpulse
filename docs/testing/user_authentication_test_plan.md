# User Authentication Test Plan

This document outlines the test cases for user authentication in the TrendPulse Dashboard application.

## Prerequisites

- Backend API server is running on `http://localhost:8000`
- Frontend server is running on `http://localhost:3000`
- Database properly initialized

## Test Cases

### 1. User Registration

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-1.1 | Valid registration | 1. Go to registration page<br>2. Enter valid email and password<br>3. Submit form | Account created and user redirected to login | - |
| TC-1.2 | Invalid email format | 1. Go to registration page<br>2. Enter invalid email<br>3. Submit form | Validation error for email format shown | - |
| TC-1.3 | Weak password | 1. Go to registration page<br>2. Enter weak password<br>3. Submit form | Validation error for password requirements | - |
| TC-1.4 | Duplicate email | 1. Register with email address<br>2. Try to register with same email again | Error message about existing account | - |
| TC-1.5 | Password confirmation mismatch | 1. Enter password<br>2. Enter different confirmation password<br>3. Submit form | Error about password mismatch | - |

### 2. User Login

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-2.1 | Valid login | 1. Enter correct email and password<br>2. Submit login form | User logged in and redirected to dashboard | - |
| TC-2.2 | Wrong password | 1. Enter correct email<br>2. Enter wrong password<br>3. Submit form | Error message about invalid credentials | - |
| TC-2.3 | Non-existent user | 1. Enter email not in system<br>2. Enter any password<br>3. Submit form | Error message about invalid credentials | - |
| TC-2.4 | Empty fields validation | 1. Leave fields empty<br>2. Submit form | Validation errors for required fields | - |
| TC-2.5 | Remember me functionality | 1. Check "Remember Me"<br>2. Login<br>3. Close browser and reopen | User session preserved | - |

### 3. JWT Token Management

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-3.1 | Token storage | 1. Login successfully<br>2. Check browser storage | JWT token properly stored | - |
| TC-3.2 | Token inclusion in API calls | 1. Login<br>2. Make API request<br>3. Check request headers | Authorization header contains token | - |
| TC-3.3 | Token expiration | 1. Login<br>2. Modify token to be expired<br>3. Make API request | User redirected to login page | - |
| TC-3.4 | Token refresh | 1. Login<br>2. Wait near expiration time<br>3. Make API request | Token refreshed automatically | - |
| TC-3.5 | Invalid token handling | 1. Login<br>2. Modify token to be invalid<br>3. Make API request | User redirected to login page | - |

### 4. Logout Functionality

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-4.1 | Normal logout | 1. Login<br>2. Click logout button | User logged out and redirected to login page | - |
| TC-4.2 | Token cleanup on logout | 1. Login<br>2. Logout<br>3. Check browser storage | Token removed from storage | - |
| TC-4.3 | Protected route access after logout | 1. Login<br>2. Logout<br>3. Try to access protected route | User redirected to login page | - |
| TC-4.4 | API call after logout | 1. Login<br>2. Logout<br>3. Try to make API call | API call fails with auth error | - |
| TC-4.5 | Multiple tabs logout | 1. Login in multiple tabs<br>2. Logout in one tab<br>3. Try to use other tabs | All tabs recognize logout state | - |

### 5. Protected Routes

| Test ID | Description | Steps | Expected Result | Status |
|---------|-------------|-------|----------------|--------|
| TC-5.1 | Access to dashboard when logged in | 1. Login<br>2. Navigate to dashboard | Dashboard displayed correctly | - |
| TC-5.2 | Access to dashboard when not logged in | 1. Ensure logged out<br>2. Try to access dashboard directly | Redirected to login page | - |
| TC-5.3 | Deep link access when not logged in | 1. Logout<br>2. Try to access specific topic stream URL | Redirected to login, then to requested page after login | - |
| TC-5.4 | Login page access when already logged in | 1. Login<br>2. Try to access login page | Redirected to dashboard | - |
| TC-5.5 | API endpoint access without authentication | 1. Make API call without auth token | 401 Unauthorized response | - |

## Planned Automated Tests

The following tests should be implemented as unit or integration tests:

1. User registration form validation
2. Authentication middleware
3. JWT token handling
4. Protected route redirection
5. API authentication checks

## Notes

- Use separate test database for auth testing
- Reset database between tests
- Test with various browsers and incognito modes
- Consider implementing CSRF protection and testing
- Consider session duration and inactivity timeout testing 