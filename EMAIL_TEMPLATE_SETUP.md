# Email Template Setup & Verification Flow

## Overview
This document guides you through setting up proper email verification templates in Supabase and ensuring the verification flow works correctly.

## Part 1: Supabase Email Template Configuration

### Step 1: Access Email Templates in Supabase
1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project: `hfnszgykpahacobpziqv`
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Configure Signup Email Template

**Template Name:** Signup/Confirmation
**Type:** Confirmation (OTP)

**Email Subject:**
```
Verify your email for Redman Finance
```

**Email Body (HTML):**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a1a1a; margin: 0;">Welcome to Redman Finance! 🎉</h1>
  </div>

  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <p style="color: #333; font-size: 16px; margin-top: 0;">Hi there,</p>
    <p style="color: #555; font-size: 14px; line-height: 1.6;">
      Thank you for signing up with Redman Finance! To get started and claim your <strong>$50 signup bonus</strong>, 
      please verify your email address using the code below.
    </p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <div style="background-color: #E85008; padding: 15px 30px; border-radius: 6px; display: inline-block;">
      <p style="font-size: 32px; color: white; letter-spacing: 4px; margin: 0; font-weight: bold;">
        {{ .Token }}
      </p>
    </div>
    <p style="color: #999; font-size: 12px; margin-top: 10px;">This code expires in 24 hours</p>
  </div>

  <div style="background-color: #f0f7ff; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0; border-radius: 4px;">
    <p style="color: #0066cc; font-weight: bold; margin-top: 0;">⏱️ Quick Start Guide:</p>
    <ol style="color: #555; font-size: 13px; margin-bottom: 0;">
      <li>Enter the 6-digit code in your verification screen</li>
      <li>Your $50 bonus will be credited immediately</li>
      <li>You can start investing right away</li>
    </ol>
  </div>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

  <p style="color: #999; font-size: 12px; margin-bottom: 10px;">
    <strong>⚠️ Security Note:</strong> Never share this code with anyone. Redman Finance support will never ask for your verification code.
  </p>

  <div style="text-align: center; color: #999; font-size: 11px;">
    <p>© 2025 Redman Finance. All rights reserved.</p>
    <p>
      <a href="https://redmanfinance.com/privacy" style="color: #0066cc; text-decoration: none;">Privacy Policy</a> | 
      <a href="https://redmanfinance.com/terms" style="color: #0066cc; text-decoration: none;">Terms of Service</a>
    </p>
  </div>
</div>
```

**Plain Text Version:**
```
Welcome to Redman Finance!

Thank you for signing up! To get started and claim your $50 signup bonus, please verify your email using the code below:

{{ .Token }}

This code expires in 24 hours.

Quick Start:
1. Enter the 6-digit code in your verification screen
2. Your $50 bonus will be credited immediately
3. You can start investing right away

Security Note: Never share this code with anyone.

© 2025 Redman Finance. All rights reserved.
```

### Step 3: Configure Magic Link (Optional - for Link-Based Verification)

**Template Name:** Confirmation Link
**Type:** Email Change / Magic Link

**Email Subject:**
```
Your Redman Finance verification link
```

**Email Body (HTML):**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a1a1a; margin: 0;">Verify Your Email</h1>
  </div>

  <p style="color: #555; font-size: 14px; line-height: 1.6;">
    Click the button below to verify your email address and activate your Redman Finance account:
  </p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="background-color: #E85008; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      Verify Email Address
    </a>
  </div>

  <p style="color: #999; font-size: 12px;">
    If the button doesn't work, copy and paste this link into your browser:<br>
    {{ .ConfirmationURL }}
  </p>

  <p style="color: #999; font-size: 12px; margin-top: 20px;">
    This link expires in 24 hours.
  </p>
</div>
```

### Step 4: Apply Changes

1. Click **Save** on each template
2. The templates are now active for all new signups

## Part 2: Enable Email Confirmation

1. Go to **Authentication** → **Providers**
2. Click on **Email**
3. Enable **Confirm email** - This is REQUIRED for verification
4. Disable **Confirm email change** (optional)
5. Click **Save**

## Part 3: Set Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add these Redirect URLs under **Allowed Redirect URLs**:
```
http://localhost:3000/auth/callback
http://localhost:4028/auth/callback
https://yourdomain.com/auth/callback
```

## Part 4: Frontend Verification Flow

The app now implements a two-step verification:

### Step 1: Success Screen
- Shows after successful signup
- Displays "$50 bonus" message
- Offers two options:
  - "Verify Email & Continue" → Goes to verification screen
  - "Sign In Later" → Skips to login

### Step 2: Email Verification Code Entry
- User enters the 6-digit code from their email
- Resend code option with 60-second cooldown
- Clear UX showing masked email address
- Helpful tips about spam/promotions folders

## Part 5: Dashboard Protection (Middleware)

To protect the dashboard and ensure only verified users can access it:

Create `src/middleware.ts`:

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if exists
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith('/user-dashboard') || 
      req.nextUrl.pathname.startsWith('/super-admin-dashboard') ||
      req.nextUrl.pathname.startsWith('/subadmin-dashboard')) {
    
    // No session: redirect to login
    if (!session) {
      return NextResponse.redirect(new URL('/sign-up-login-screen', req.url));
    }

    // Has session but email not verified: redirect to verify email
    if (!session.user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/verify-email?email=' + session.user.email, req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/user-dashboard/:path*',
    '/super-admin-dashboard/:path*',
    '/subadmin-dashboard/:path*',
  ],
};
```

## Troubleshooting

### Issue: Verification code not received in email

**Solution:**
1. Check **spam/promotions folder** - Sometimes emails go there
2. Wait up to 2 minutes - Email delivery can be slow
3. Check your email address is correct - Typos prevent delivery
4. Use **Resend Code** button if it's been sent but not received

### Issue: Code says "Invalid or Expired"

**Solution:**
1. Copy the exact code from email (no extra spaces)
2. Codes expire after 24 hours - Request a new one
3. Check code was entered within the valid period
4. Some email clients may alter the code formatting

### Issue: Template still shows default text

**Solution:**
1. Make sure you **saved** the template after editing
2. Clear browser cache (Ctrl+Shift+Delete)
3. Restart the dev server
4. Test with a new signup (new users get the latest template)

### Issue: Email verification succeeds but user still can't login

**Solution:**
1. The user must have an account in the `users` table with their email
2. Check that `email_verified = true` in the `users` table
3. Verify no RLS policies are blocking access
4. Check user `account_status` is `active`

## Testing

### Test Steps:
1. Sign up with a test email
2. Check email inbox (including spam folder)
3. Copy the 6-digit code
4. Paste into verification screen
5. Should see success message
6. User should be able to login and access dashboard

### Test with Different Email Providers:
- Gmail (check spam folder)
- Outlook (check junk folder)
- Other providers (always check spam)

## Best Practices

✅ Always include verification code in OTP format (easier to enter)
✅ Make email templates branded and professional
✅ Include security warnings about code sharing
✅ Use fallback plain text for email clients that don't support HTML
✅ Set reasonable code expiration (24 hours is standard)
✅ Provide resend option with cooldown to prevent abuse
✅ Clearly communicate next steps after verification

## Variables Available in Templates

- `{{ .Token }}` - The verification/OTP code (6 digits)
- `{{ .ConfirmationURL }}` - The confirmation link (includes token)
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL

## Security Considerations

1. **Never** show verification codes in logs or error messages
2. **Always** use HTTPS for your application
3. **Limit** code entry attempts (max 5 attempts before cooldown)
4. **Expire** codes after 24 hours maximum
5. **Use** proper CORS headers to prevent unauthorized access
6. **Validate** email format before sending verification codes

---

**Last Updated:** 2025-06-14
**Status:** ✅ Active and Tested
