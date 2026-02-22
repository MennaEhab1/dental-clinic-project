# API Integration Debugging Guide

## Overview

This guide helps troubleshoot authentication and appointment booking issues with the SmartTeethCare API integration.

## Key Concepts

### Token Storage

- Tokens are stored **in-memory only** (cleared on logout or page refresh)
- NOT stored in localStorage for security
- Token automatically attached to all protected endpoints via Authorization header
- Format: `Authorization: Bearer <token>`

### Patient ID Extraction

The system tries to extract patient ID from the JWT token claims, looking for these fields (in order):

1. `sub` (Subject)
2. `userId`
3. `patientId`
4. `id`
5. `nameid` (ASP.NET standard)
6. `oid` (Azure AD object ID)

## Debugging Workflow

### Step 1: Check Console Logs After Login

Open **Browser DevTools Console** (F12 → Console tab) and look for these logs:

#### ✅ Expected successful login logs:

```
[setAuthToken] Storing new token: eyJhbGciOiJIUzI1NiIs...
[authService] Login successful, token stored: eyJhbGciOiJIUzI1NiIs...
[authService] User ID from response: 123
[authService] Patient ID from token claims: 123
```

#### ❌ Problem sign - Missing token:

```
[authService] Login failed - no token in response
```

→ **Action**: Check if backend is returning `token` field in login response

#### ❌ Problem sign - Cannot extract ID from token:

```
[authService] Patient ID from token claims: NOT FOUND IN TOKEN
```

→ **Action**: Token doesn't contain patient ID. Backend needs to include one of the expected claim names (sub, userId, patientId, id, nameid, oid)

### Step 2: Check Logs When Fetching Appointments

Search console for:

```
[appointmentService.getByPatient] Fetching appointments for patient (from token): 123 Token present: true
```

#### ✅ Success case - request is made:

- If appointment list appears: ✅ **Working correctly**
- If 400 error appears: → Go to Step 4

#### ❌ Problem - Patient ID missing:

```
[appointmentService.getByPatient] Fetching appointments for patient (from token): unable to extract from JWT Token present: true
```

→ **Action**: Token exists but has no patient ID claim. Need to fix backend login response.

#### ❌ Problem - No token:

```
[appointmentService.getByPatient] Fetching appointments for patient (from token): unable to extract from JWT Token present: false
```

→ **Action**: Not authenticated. Check if login succeeded (Step 1).

### Step 3: Check Console Logs During Booking

Search console for:

```
[appointmentService] Booking request - DTO: {dentistId: 1, appointmentDate: "2026-02-15T14:30:00.000Z"}
Token claims: {sub: "123", email: "user@example.com", ...}
Patient ID from data: undefined
```

#### Key information:

- **dentistId**: Doctor ID being booked (should be numeric)
- **appointmentDate**: ISO 8601 datetime (should be valid)
- **Token claims**: Shows all claims in the JWT
  - Look for `sub`, `userId`, `patientId`, `id`, `nameid`, or `oid` fields
  - **If you see one**, that's the patient ID the backend should use
  - **If you don't see any**, the backend login response doesn't include a patient ID claim

### Step 4: Interpret 400 Errors

When a 400 error occurs, look for this pattern in console:

```
[apiCall] Bad Request (400): /api/PatientAppointment/BookAppointment
Full response: {...}
[apiCall] Token claims: {sub: "123", email: "user@example.com", ...}
Validation errors: [{"field": "dentistId", "message": "Invalid doctor"}]
```

#### What to check:

1. **Token is present?**
   - Look at the Token claims section
   - If it's `{}` (empty object), token couldn't be decoded

2. **Validation errors shown?**
   - If you see specific field errors → Fix those fields
   - If validation errors is `[]` or empty → Backend error body is empty (contact backend team)

3. **Check the actual request** (Chrome DevTools):
   - F12 → Network tab
   - Find the request to `/api/PatientAppointment/BookAppointment`
   - Check "Headers" → "Authorization" header
     - ✅ Should be: `Bearer eyJhbGciOiJIUzI1NiIs...`
     - ❌ If missing or empty: Token not attached, likely not authenticated

4. **Check request body**:
   - In Network tab, click request → Request body
   - Should show: `{"dentistId": 1, "appointmentDate": "2026-02-15T14:30:00.000Z"}`
   - If different: DTO mapping issue

## Common Issues & Solutions

### Issue: "Patient not found" (400)

**Likely cause**: Backend can't identify the patient from the request

**Solutions**:

1. Verify patient ID is in the JWT token:
   - Check `[authService] Patient ID from token claims:` log
   - If NOT FOUND → Backend login response needs to include a patient ID claim

2. Verify token is attached to request:
   - Check Network tab for Authorization header
   - If missing → Authentication not working

3. Check if endpoint expects patientId in request body:
   - Currently we send: `{dentistId, appointmentDate}`
   - If backend needs patientId in body, we need to update the DTO

### Issue: Appointments shown in listing but not in booking response

**Likely cause**: Server includes appointment in list but booking returns empty

**Solutions**:

- System will automatically fetch the full list and find matching appointment
- If still doesn't work, check if returned appointment IDs match the booking date/time

### Issue: Login succeeds but appointments remain empty

**Likely causes**:

1. Token doesn't contain patient ID (Step 2 check)
2. Patient has no appointments in backend
3. Backend returns empty list because it can't identify patient

**Solutions**:

- Try booking an appointment first
- Then refresh appointment list
- Check if newly booked appointment appears

## Test Credentials

Ask your backend team or administrator for:

- Test user email
- Test user password
- Expected test user ID

Then during login, verify in console:

- `[authService] Patient ID from token claims: <should show the expected ID>`

## Advanced Debugging

### Decode JWT Token Manually

If you need to inspect the full token contents:

1. Copy the token from `[setAuthToken] Storing new token:` log
2. Go to https://jwt.io
3. Paste the full token in the "Encoded" section
4. Check the payload (middle section) for all claims
5. Look for any of: sub, userId, patientId, id, nameid, oid

### Check Backend Response Format

If login response doesn't include expected fields:

1. F12 → Network tab
2. Filter for `/api/Account/login` request
3. Check "Response" tab
4. Should see structure like:

```json
{
  "userName": "johndoe",
  "email": "john@example.com",
  "role": "patient",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "id": "123" // or userId, patientId, sub, etc.
}
```

If the ID field is missing or has different name, contact backend team.

## When to Contact Backend Team

Provide these details:

1. Full token payload (from jwt.io decode)
   - Specifically: which claim identifies the patient?
2. Expected BookAppointment DTO format
   - Does it need patientId in request body?
   - Or should it extract from token?
3. Full 400 error response body (if shown in console)
4. Test user credentials to reproduce issue

## Useful Console Commands

Filter logs in console:

```
// Show only auth logs
console.clear(); // Then filter by "[authService]"

// Show only appointment logs
// Filter by "[appointmentService]"

// Show API calls
// Filter by "[apiCall]"
```

## Related Files

- **API Client**: `src/services/api.ts`
  - Contains all logging statements
  - Token management functions
  - Patient ID extraction logic
- **Auth Context**: `src/contexts/AuthContext.tsx`
  - React context for authentication state
- **Booking Page**: `src/pages/booking/BookingPage.tsx`
  - Where appointments are booked
  - Uses userID for request
- **Appointments List**: `src/pages/patient/PatientAppointments.tsx`
  - Displays patient's appointments
  - Auto-refreshes after booking

## Quick Checklist

- [ ] Login shows token stored in console
- [ ] Token claims show patient ID (sub, userId, patientId, id, nameid, or oid)
- [ ] `getByPatient()` shows patient ID extracted from token
- [ ] Network tab shows Authorization header with Bearer token
- [ ] Booking DTO shows correct dentistId and appointmentDate
- [ ] No 400 errors or 400 errors show what field is invalid
- [ ] Appointments list refreshes after successful booking
