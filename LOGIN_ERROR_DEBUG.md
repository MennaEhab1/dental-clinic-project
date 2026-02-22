# Login 500 Error - Debug Steps

## What We Fixed

I found the bug! The login endpoint **should not require authentication**, but our code was warning about missing tokens on it. This could have been causing issues.

**Fixed:**

- Login and register endpoints are now marked as **public endpoints** (don't require Authorization header)
- Removed the warning about missing tokens on these endpoints
- Other endpoints remain protected

## What to Do Now

### Step 1: Hard Refresh the Browser

- **Windows**: Press `Ctrl+Shift+F5`
- **Mac**: Press `Cmd+Shift+R`
- This loads the updated code

### Step 2: Clear Console

- Press `F12` to open DevTools
- Click the X button in the console to clear all logs
- Or type `console.clear()` and press Enter

### Step 3: Try Logging In Again

- Go to login page
- Enter your credentials
- Click login/submit

### Step 4: Check Console Output

#### ✅ If you see this:

```
[apiCall] Public endpoint (no auth required): /api/Account/login
[apiCall] Calling https://smart-teeth-care.runasp.net/api/Account/login
[setAuthToken] Storing new token: eyJhbGciOiJIUzI1Nii...
[authService] Login successful, token stored: ...
[authService] User ID from response: ...
[authService] ALL JWT Claims after login:
```

Then look at the **JWT Claims table** and find the field that looks like a patient ID (see TOKEN_CLAIMS_ACTION_PLAN.md for details).

#### ❌ If you still get 500 error:

```
[apiCall] Public endpoint (no auth required): /api/Account/login
api.ts:169 POST https://smart-teeth-care.runasp.net/api/Account/login 500 (Internal Server Error)
[apiCall] Error: /api/Account/login 500 Internal Server Error
```

This means the backend service is returning an error. Check:

1. **Is the backend running?**
   - Visit https://smart-teeth-care.runasp.net/swagger/index.html
   - Should load the Swagger API documentation
   - If blank/error: Backend might be down

2. **Backend error response**:
   - Open DevTools Network tab (F12 → Network tab)
   - Click on the login request
   - Click "Response" tab
   - Look for error details message

3. **Check your credentials**:
   - Email format should be valid (user@example.com)
   - Password should be correct
   - Account must exist on the backend

## If Backend Returns 500 Error

The 500 error is coming from the backend service itself. Possible causes:

1. **Backend Service Down**
   - Check if https://smart-teeth-care.runasp.net is accessible
   - Try accessing Swagger: https://smart-teeth-care.runasp.net/swagger/index.html

2. **Database Connection Issue**
   - Backend can't connect to its database
   - Backend team needs to check server logs

3. **Invalid Request Format**
   - Very unlikely since we send standard JSON
   - But backend team can confirm

4. **Invalid Credentials**
   - In some cases, server errors might be misconfigured
   - Try different test account if available

## Contact Backend Team

If you continue getting 500 errors, ask the backend team:

> "The /api/Account/login endpoint is returning HTTP 500 'Internal Server Error'. Is the backend service running? Can you check the server logs?"

### Provide them with:

- Your email address used for login attempt
- Whether the error happens for all users or just your account
- Screenshots of error response from browser

## Expected Login Flow After Fix

1. Enter email/password → Click Login
2. Check console for:
   - `[apiCall] Public endpoint (no auth required): /api/Account/login`
   - `[setAuthToken] Storing new token`
   - JWT Claims table appears
3. Page redirects to dashboard/home
4. Try accessing appointments
5. Look for JWT Claims table in console after login
6. Report the claim names/values you see

## Quick Checklist

- [ ] Hard refreshed browser (Ctrl+Shift+F5)
- [ ] Cleared console logs
- [ ] Verified backend is accessible (check Swagger URL)
- [ ] Tried logging in with valid credentials
- [ ] Checked console for "Public endpoint" message
- [ ] If login works: looked for JWT Claims table
- [ ] If login fails: checked Network tab response
- [ ] Ready to report findings or share error details
