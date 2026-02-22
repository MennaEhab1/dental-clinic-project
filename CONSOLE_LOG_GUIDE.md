# Console Log Interpretation Guide - "Patient not found" Error

Based on your error:`[apiCall] Bad Request (400): /api/PatientAppointment/GetMyAppointments`
`[apiCall] Validation errors: Patient not found`

This guide explains what to look for in the console logs to debug the issue.

## Step 1: Check Your Login Status

**Before you do anything else**, verify you're logged in by looking for this log pattern in the console:

```
[setAuthToken] Storing new token: eyJhbGciOiJIUzI1NiIs...
[authService] Login successful, token stored: eyJhbGciOiJIUzI1NiIs...
[authService] User ID from response: 123
[authService] Patient ID from token claims: 123
```

### ✅ If you see these logs:

- You're successfully authenticated
- The token contains a patient ID claim
- Proceed to Step 2

### ❌ If you DON'T see these logs:

- **Action needed**: Try logging in again
- Check if login form shows any errors
- If login succeeds in the UI but you don't see these logs, the page might not have reloaded the code changes

---

## Step 2: Fetch Appointments → Look for Token Debug Info

When you try to view your appointments, search the console for:

```
[appointmentService.getByPatient]
  tokenPresent: true
  tokenPrefix: "eyJhbGciOiJIUzI1N..."
  decodedClaims: {sub: "123", email: "user@example.com", ...more fields...}
  extractedPatientId: "123"
  allClaimKeys: ["sub", "email", "role", ...more...]
  endpoint: "/api/PatientAppointment/GetMyAppointments"
```

### ✅ If you see this with a patient ID:

- **Good sign**: Token contains patient ID
- The backend should be able to identify you
- The fact that you're still getting "Patient not found" means the backend might not be extracting the patient ID from the token properly

### ⚠️ If extractedPatientId is "unable to extract from JWT":

- **Problem**: Your token doesn't contain any patient ID
- **Cause**: Backend login response doesn't include patient identifier
- **Solution needed**: Backend team needs to add patient ID to login response

### ❌ If tokenPresent is false:

- **Problem**: You're not authenticated
- **Action**: Make sure you successfully logged in first

---

## Step 3: When 400 Error Occurs - Full Debug Object

When the 400 "Patient not found" error is thrown, look for this detailed log:

```
[apiCall] Bad Request (400): /api/PatientAppointment/GetMyAppointments
  status: 400
  response: {message: "Patient not found"}  ← This is what backend returned
  tokenPresent: true
  tokenLength: 450                          ← Token is a valid length
  decodedClaims: {
    sub: "123",                             ← Usually the user ID
    email: "john@example.com",
    role: "patient",
    iat: 1707...,
    exp: 1707...,
    ...other claims...
  }
  extractedPatientId: "123"
  allClaimKeys: ["sub", "email", "role", "iat", "exp"]  ← Shows all fields in token
```

### What Each Field Tells You:

**tokenPresent: true**

- ✅ Good: Token is stored and attached to request

**tokenLength: 450+ characters**

- ✅ Good: Token appears valid (too short = invalid)

**decodedClaims object with fields like sub, email, role**

- ✅ Good: Token was successfully decoded
- Shows all the information in your JWT

**extractedPatientId: "123" (or any number/string)**

- ✅ Good: We found a likely patient ID in the token
- This should be used by the backend to find your appointments

**"Patient not found" in response**

- ❌ Problem: Backend says it cannot find patient with this ID
- Possible reasons:
  1. Patient ID format mismatch (backend looking for integer but token has string)
  2. Patient ID in token doesn't match any patient in database
  3. Backend not extracting patient ID from token correctly
  4. Database doesn't have an entry for this patient ID

---

## Step 4: Booking Request → Check Request Details

When you try to book an appointment, look for:

```
[appointmentService.create]
  endpoint: "/api/PatientAppointment/BookAppointment"
  requestDto: {
    dentistId: 1,
    appointmentDate: "2026-02-15T10:30:00.000Z"
  }
  tokenPresent: true
  tokenPrefix: "eyJhbGciOiJIUzI1N..."
  decodedClaims: {sub: "123", email: "...", ...}
  extractedPatientId: "123"
  dataPatientId: undefined
```

### ✅ Check the requestDto:

- **dentistId**: Should be a number (1, 2, 3, etc.) ← If you see "NaN", there's a problem with doctor selection
- **appointmentDate**: Should be ISO 8601 format like `"2026-02-15T10:30:00.000Z"` ← If malformed, booking will fail

### 🔍 Look for extractedPatientId:

- If it's a valid ID and token is present, the backend should be able to identify the patient
- If still getting 400 "Patient not found", the backend might not be extracting patient ID from token

---

## Step 5: Check Authorization Header in Network Tab

This is the most direct test:

1. **Open DevTools**: F12 in browser
2. **Go to Network tab**
3. **Try to fetch appointments** (refresh the page while on appointments section)
4. **Look for request to**: `smart-teeth-care.runasp.net/api/PatientAppointment/GetMyAppointments`
5. **Click on it → Headers tab**
6. **Look for Authorization header**:

### ✅ Correct:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJz...
```

### ❌ Missing:

```
(Authorization header not present)
```

### ❌ Wrong format:

```
Authorization: eyJhbGciOiJIUzI1NiIs...  ← Missing "Bearer " prefix!
Authorization: Bearer                      ← Empty token!
```

If the Authorization header is missing or malformed, the backend can't identify who you are.

---

## Most Likely Diagnosis Based on "Patient not found" Error

### Scenario A: Token IS present but backend says "Patient not found"

**Signs**:

- `tokenPresent: true`
- `extractedPatientId: "123"` (or similar)
- Response: `"Patient not found"`

**Diagnosis**:

- Token is sent correctly
- Backend CAN'T find patient with ID from token
- Possible causes:
  - Patient ID format mismatch (string vs integer)
  - Patient doesn't exist in database with that ID
  - Backend not extracting patient ID from token correctly

**Next step**:

- Share the full token claims and patient ID with backend team
- Ask: "What patient ID claim should we use? (sub, userId, patientId, oid?)"
- Ask: "Does the patient exist in your database? Can you check by ID?"

### Scenario B: Token is NOT present

**Signs**:

- `tokenPresent: false`
- No Authorization header in Network tab

**Diagnosis**:

- Login didn't work or token wasn't stored
- Not authenticated

**Next step**:

- Clear browser cache and hard refresh (Ctrl+Shift+F5)
- Log in again
- Check if login succeeded

### Scenario C: Token is mangled/can't decode

**Signs**:

- `decodedClaims: {}`
- `extractedPatientId: undefined`
- Token appears copied incorrectly

**Diagnosis**:

- Token is corrupted or truncated

**Next step**:

- Log out and log in again
- Clear browser cache

---

## What to Report to Backend Team

When asking backend team for help, include:

1. **Your JWT token claims** (from console log `decodedClaims`)
   - Specifically: What field contains your patient/user ID?
   - Example: "My token has sub: '12345' but backend says patient not found"

2. **What you expected to happen**:
   - "I logged in and should be able to see my appointments"

3. **What actually happened**:
   - "After login, appointments show error 'Patient not found'"

4. **Console logs** (share the full `[appointmentService.getByPatient]` and `[apiCall] Bad Request` logs)

5. **Patient ID if known**:
   - "My patient ID should be: [number]"
   - "I was created as a test patient with email: user@example.com"

---

## Quick Checklist Before Testing

- [ ] Hard refresh browser (Ctrl+Shift+F5 / Cmd+Shift+R)
- [ ] Clear all console logs (type `console.clear()` or click X to clear)
- [ ] Log out if already logged in
- [ ] Close DevTools and reopen (F12)
- [ ] Tested with valid email and password
- [ ] Device time is correct (JWT expiration depends on server time)
- [ ] Checked network connection/no firewalls blocking API

---

## Console Log Format Reference

### ✅ Successful login sequence:

```
[setAuthToken] Storing new token: eyJhb...
[authService] Login successful, token stored: eyJhb...
[authService] User ID from response: 123
[authService] Patient ID from token claims: 123
[getAuthToken] Returning stored token: eyJhb...
```

### ✅ Successful appointment fetch:

```
[appointmentService.getByPatient] {tokenPresent: true, extractedPatientId: "123", ...}
[apiCall] Protected endpoint - token attached {endpoint: "/api/PatientAppointment/GetMyAppointments", ...}
[apiCall] Calling https://smart-teeth-care.runasp.net/api/PatientAppointment/GetMyAppointments {method: "GET"}
[apiCall] Success: /api/PatientAppointment/GetMyAppointments {status: 200}
```

### ❌ Failed appointment fetch:

```
[appointmentService.getByPatient] {tokenPresent: true, extractedPatientId: "123", ...}
[apiCall] Protected endpoint - token attached {...}
[apiCall] Calling https://smart-teeth-care.runasp.net/api/PatientAppointment/GetMyAppointments {method: "GET"}
[apiCall] Bad Request (400): /api/PatientAppointment/GetMyAppointments {
  status: 400,
  response: {message: "Patient not found"},
  decodedClaims: {...},
  extractedPatientId: "123"
}
[apiCall] Validation errors: Patient not found
Failed to fetch appointments: Error: Patient not found
```

---

## Need More Help?

1. **Take a screenshot** of the console showing all logs from login through error
2. **Check the DEBUGGING_GUIDE.md** for additional context
3. **Verify backend is running**: https://smart-teeth-care.runasp.net/swagger/index.html (should load Swagger)
4. **Check browser Network tab** for actual response bodies:
   - Right-click failing request → "Copy as cURL"
   - Share that with backend team
