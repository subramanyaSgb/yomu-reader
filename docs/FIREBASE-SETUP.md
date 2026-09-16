# Firebase Setup — one-time owner handoff (Phase 4)

The app runs **fully local-only without any of this**. Do it only when you want Google login,
cross-device sync, and new-chapter push notifications. Free tier ("Spark") covers a personal app.

## 1. Create the Firebase project
1. https://console.firebase.google.com → Add project (e.g. `yomu`). Disable Analytics (optional).
2. **Authentication** → Sign-in method → enable **Google**.
3. **Firestore Database** → Create (production mode) → pick a region.
4. **Cloud Messaging** (for push): note it's enabled by default.

## 2. Register a Web App + get config
1. Project settings → Your apps → Web (`</>`). Register `Yomu`.
2. Copy the config values into `.env` (and Vercel env):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project>
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_SENDER_ID=...        # Cloud Messaging Sender ID
VITE_FCM_VAPID_KEY=...             # Cloud Messaging → Web Push certificates → key pair
```
If these are absent, Profile shows "Sync is off" and everything else works.

## 3. Firestore security rules (scope data to the owner)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 4. Deploy the notification poller (Cloud Function)
```
npm i -g firebase-tools
firebase login
firebase use <project>
cd functions && npm install && npm run deploy
```
This deploys `pollChapters` (runs every 45 min): checks your notify-flagged follows and sends
batched FCM digests. Requires the Blaze plan for scheduled functions *outbound* fetch — if you
stay on Spark, notifications won't run but the rest of sync works.

## 5. Vercel
Add the same `VITE_FIREBASE_*` + `VITE_FCM_VAPID_KEY` + `VITE_IMAGE_PROXY` in
Project Settings → Environment Variables, then redeploy.

## Notes
- Auth is Google-only (per PRD). Data lives under `users/{uid}/...`, LWW-merged.
- Download *images* never leave the device; only the download *list* syncs.
