# Mobile Password Reset Contract

This backend supports dual reset modes from one forgot-password request:

1. Web link reset
2. Email OTP reset

## Endpoints

### `POST /api/v1/auth/forgot-password`
Request body:
```json
{ "email": "user@example.com" }
```
Response (always generic):
```json
{
  "success": true,
  "message": "If an account exists with this email, you will receive password reset instructions."
}
```

Behavior:
- Sends email containing both reset link and 6-digit OTP.
- OTP and link expire together (default 15 minutes).

### `POST /api/v1/auth/reset-password`
Request body:
```json
{ "token": "<link-token>", "newPassword": "new-password" }
```
Success:
```json
{ "success": true, "message": "Password has been reset successfully. Please login with your new password." }
```

### `POST /api/v1/auth/reset-password-otp`
Request body:
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "new-password"
}
```
Success:
```json
{ "success": true, "message": "Password has been reset successfully. Please login with your new password." }
```

## Error semantics (mobile)
- Invalid/expired credentials: HTTP 401 with generic message.
- Too many OTP attempts: HTTP 401 with lockout message.
- Validation failures: HTTP 422 with field details.

## Recommended mobile UX
1. User enters email in forgot-password screen.
2. Show generic success message regardless of account existence.
3. On reset screen, default to OTP mode:
   - email + OTP + new password.
4. Optionally support app deep-link from email link.
5. On success, navigate user to login and clear local auth state.