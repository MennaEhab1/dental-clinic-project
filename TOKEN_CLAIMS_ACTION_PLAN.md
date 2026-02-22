# ROOT CAUSE ANALYSIS: "Patient not found" Error

## What We've Discovered ✓

Based on your error logs, we now know:

```
✅ tokenPresent: true                          ← Token EXISTS
✅ tokenLength: 656 characters                 ← Token is VALID SIZE
✅ decodedClaims: {...}                        ← Token can be DECODED
❌ extracted patient ID from token: NONE FOUND ← Token has NO PATIENT ID FIELD
```

**The Problem**: Your backend's JWT token **does not include a patient identifier**. It's issued without any field like `sub`, `userId`, `patientId`, `id`, `nameid`, or `oid`.

## What the Backend Is Sending

The backend successfully authenticates you and issues a JWT token, BUT that token lacks the information needed to identify which patient you are. When appointment endpoints try to look up your appointments, they can't find a patient ID in the token, so they return "Patient not found".

## How to Find the Actual Patient ID Field

The backend MUST be using SOME field to identify users in the token. Here's how to find it:

### Step 1: Log In and Check Console Immediately

1. **Hard refresh** your browser: `Ctrl+Shift+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear console**: Click the X button or type `console.clear()`
3. **Log in** with your credentials
4. **Look for this table in the console**:

```
┌─────────────────┬────────────────────────────┬──────────┐
│ claimName       │ claimValue                 │ type     │
├─────────────────┼────────────────────────────┼──────────┤
│ exp             │ 1707932400                 │ number   │
│ iat             │ 1707846000                 │ number   │
│ nbf             │ 1707846000                 │ number   │
│ jti             │ abc123def456...            │ string   │
│ email           │ user@example.com           │ string   │
│ userName        │ john.doe                   │ string   │
│ role            │ patient                    │ string   │
│ ??? (find this) │ 123 (or your ID)           │ string   │
└─────────────────┴────────────────────────────┴──────────┘
```

**Look for a field that:**

- Contains a number or ID-like value (e.g., "123", "abc-def-123", UUID format)
- Makes sense as a patient/user identifier
- Is NOT: exp, iat, nbf, jti (these are standard JWT fields)

### Step 2: Share That Claim Name

Once you find it, tell me:

- **The claim name** (e.g., "patientNumber", "healthId", "userId", "oid", etc.)
- **The claim value** (e.g., "12345")
- **Screenshot of the table** if possible

## What I'll Do With That Information

Once we know the actual claim name the backend uses (e.g., "patientNumber"), I can:

1. Add "patientNumber" to the list of patient ID field names we check for
2. Update `extractPatientIdFromToken()` to look for that field
3. Test with your actual token to confirm appointments work

## Temporary Workaround (If You Need to Test Before Fixing)

If the backend's patient ID is stored in the database and you know your patient ID number:

1. Try to manually extract it from https://jwt.io:
   - Paste your full token in "Encoded" section
   - Look at the decoded payload (middle section)
   - Find ANY field that looks like it could be your ID
   - Try each one as a potential "look for this field" candidate

2. Tell me what field you find, and I'll add it to the code

## Backend Team Investigation Needed

For your backend team to fix this properly, ask them:

> "When a user logs in, what field in the JWT token identifies which patient they are? Our patients can't fetch their appointments because the token doesn't contain sub, userId, patientId, id, nameid, or oid. What claim names do you use for patient identification?"

### Response They Should Provide:

- Claim name used for patient ID (e.g., "patientNumber", "healthRecordId", etc.)
- Whether that claim is always populated for patient accounts
- Whether appointment endpoints extract patient ID from that claim in the token

## Quick Checklist

- [ ] Hard refreshed browser (Ctrl+Shift+F5)
- [ ] Cleared console logs
- [ ] Logged in fresh
- [ ] Found the JWT claims table in console
- [ ] Identified the claim name that looks like a patient ID
- [ ] Noted the claim value (your patient ID number)
- [ ] Ready to share findings with us

## Next Steps

1. **Do the console inspection above** (takes 2 minutes)
2. **Share the JWT claims table** or just tell me which field looks like your patient ID
3. **I'll update the code** to use that field name
4. **Test again** and appointments should work

The good news: The hard part (authentication and token transmission) is working perfectly! This is just a mismatch in what field name the backend uses vs. what we're looking for.
