# Quick Setup Reference

## 4 Simple Steps to Complete

### ⏱️ Step 1: Update Email Template (5 min)
```
Supabase Dashboard
  → Authentication
  → Email Templates
  → Signup/Confirmation
  → Replace with: EMAIL_TEMPLATE_SETUP.md content
  → SAVE
```

### ⏱️ Step 2: Enable Email Confirmation (2 min)
```
Supabase Dashboard
  → Authentication
  → Providers
  → Email
  → Enable "Confirm email" ✅
  → SAVE
```

### ⏱️ Step 3: Add Redirect URLs (2 min)
```
Supabase Dashboard
  → Authentication
  → URL Configuration
  → Add these URLs:
    • http://localhost:4030/auth/callback
    • http://192.168.152.1:4030/auth/callback
    • https://yourdomain.com/auth/callback
  → SAVE
```

### ⏱️ Step 4: Test (10 min)
```
1. Delete old test user (in Supabase SQL Editor or Users tab)
2. Sign up again with test email
3. Click "Verify Email & Continue"
4. Check email (spam folder too!)
5. Enter 6-digit code
6. See success message
7. Login and access dashboard
```

## Expected User Experience

✅ After signup:
- See "Account Created!" screen
- Button says "Verify Email & Continue"
- $50 bonus message shown

✅ After clicking verify:
- Verification code entry screen
- Large 6-digit code input box
- "Resend Code" button (60-second cooldown)
- Tips about spam folder

✅ After entering code:
- "Email verified!" message
- Redirect to login screen
- Can login with email/password
- Full dashboard access

## What Changed in Your App

| File | Change |
|------|--------|
| `SignUpForm.tsx` | Added verification flow & state |
| `EmailVerification.tsx` | NEW - OTP code entry component |
| `verify-email/page.tsx` | NEW - Verification page |
| `EMAIL_TEMPLATE_SETUP.md` | NEW - Setup guide + templates |

## Verification Code Format

The code sent to email is:
- **Length:** 6 digits (000000)
- **Format:** Numbers only
- **Expiration:** 24 hours
- **Example:** `123456`

## If Code Doesn't Arrive

1. Check **spam/promotions folder** ⬅️ Usually here!
2. Wait up to 2 minutes (servers can be slow)
3. Click **Resend Code** button (in app)
4. Check your email address is correct

## If Code Says "Invalid"

1. The code **expired** (> 24 hours old)
   - Click "Resend Code" to get new one
2. You entered it **wrong**
   - Numbers only, no spaces or symbols
3. You're using **old code** after a resend
   - Use the newest code from latest email

## Default Template Problem (FIXED!)

**Before:** Email was bare Supabase template
**After:** Professional branded template

The template now includes:
- Welcome message
- Clear branding
- $50 bonus reference
- Security tips
- Professional styling

## Testing Tips

✅ Use a **test email** you can access
✅ Sign up **fresh** (delete old test user first)
✅ **Check spam folder** first
✅ **Copy exactly** - no spaces
✅ **Wait 2 minutes max** for email to arrive

## Common Issues

| Issue | Solution |
|-------|----------|
| Code not received | Check spam folder |
| Code invalid | Codes expire in 24h, request new |
| Template looks default | Save after editing template |
| Can't access dashboard | Verify you entered correct code |
| Email looks plain | Make sure HTML template was saved |

## Need Help?

📖 Full Guide: `EMAIL_TEMPLATE_SETUP.md`
📋 Summary: `VERIFICATION_FIX_SUMMARY.md` (this file)
🔍 Code: `EmailVerification.tsx` component

---

**Total Setup Time: ~20 minutes**
**Ready to test: After Step 3 ✅**
