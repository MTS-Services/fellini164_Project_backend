# Google / Firebase Auth — Backend Testing

## Prerequisites

http://localhost:3000/google-login-test.html

1. Firebase service account at `./secrets/firebase-service-account.json`
2. `.env` contains:

```env
FIREBASE_PROJECT_ID=fellini-82332
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-service-account.json
```

3. Run migration + generate:

```bash
npx prisma migrate deploy
npx prisma generate
```

4. Frontend uses Firebase Web SDK + Google sign-in, then sends the **ID token**.

---

## API

```text
POST {{baseUrl}}/auth/google
Content-Type: application/json
```

```json
{
  "idToken": "<Firebase ID token from frontend>"
}
```

### Success (200)

```json
{
  "success": true,
  "message": "Google login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "user@gmail.com",
      "fullName": "Jane Doe",
      "avatar": "https://...",
      "role": "USER",
      "subscriptionPlan": "FREE",
      "isEmailVerified": true,
      "authProvider": "GOOGLE",
      "userStatus": "ACTIVE",
      "onboardingCompleted": false
    },
    "token": "<your backend JWT>",
    "isNewUser": false
  }
}
```

Use `data.token` the same way as email/password login (`Authorization: Bearer ...`).

---

## Frontend flow (summary)

1. `signInWithPopup(auth, googleProvider)` (or redirect)
2. `const idToken = await user.getIdToken()`
3. `POST /api/v1/auth/google` with `{ idToken }`
4. Store returned JWT

---

## Schema notes

- `User.password` is optional (null for Google-only users)
- `User.firebaseUid` unique
- `User.authProvider` = `EMAIL` | `GOOGLE`
- Existing email users can link Google on first Google login (same email)

---

## Errors

| Case                                                          | Message                             |
| ------------------------------------------------------------- | ----------------------------------- |
| Missing/invalid token                                         | `Invalid Google token...`           |
| Firebase not configured                                       | `503` Firebase Admin not configured |
| Email/password account without password trying password login | Continue with Google                |
