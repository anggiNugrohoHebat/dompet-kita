# Dompet Kita

Aplikasi pencatatan keuangan harian berbasis Next.js. Data tetap disimpan di browser dan dapat disinkronkan otomatis ke Google Drive setelah pengguna menghubungkan akun Google.

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Google Drive sync setup

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the Google Drive API and configure the OAuth consent screen.
3. Create an OAuth client ID with application type **Web application**. Add the app's origin to **Authorized JavaScript origins** (for local development, `http://localhost:3000`; add your production origin when deploying).
4. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the OAuth client ID. This ID is public; do not put a client secret in the app.
5. Restart the development server, open **Pengaturan Data**, and choose **Hubungkan Google Drive**.

The app requests the `drive.appdata` scope and stores a JSON backup in Google Drive's private application-data area (`appDataFolder`), which is not shown in the regular Drive file list. Local Storage remains enabled as an offline copy. After connecting, changes are uploaded automatically and other open devices are checked for updates every 15 seconds. If Google access expires, reconnect the account to resume syncing.

Google Drive is the sync mechanism, not a replacement for a separate data export or long-term backup policy. Keep using the CSV export for a portable copy.

## Android APK

The Android app packages the statically exported UI with Capacitor; it does not require hosting the UI on a web server.

1. Install Android Studio and its Android SDK.
2. Install dependencies with `npm install`.
3. Add the Android platform once with `npm run android:add`.
4. Build and copy the app assets with `npm run android:sync`.
5. Open the native project with `npm run android:open`, then build an APK or AAB from Android Studio.

The Android package name is `com.dompetkita.app`. Google Drive sign-in uses native Google sign-in on Android and the same Web OAuth client ID as `webClientId`; it requests the Drive `appDataFolder` scope directly from the user's account. Create an additional Android OAuth client in the same Google Cloud project with this package name and the signing certificate SHA-1. Get the local debug SHA-1 with `cd android && ./gradlew signingReport`; register the `debug` SHA-1 for local builds and the release/Play App Signing SHA-1 for the version distributed to users. The existing Web OAuth client remains for the browser app; do not include its client secret in the Android app.

Local Storage on Android is separate from Chrome's browser storage. To bring over existing records, connect the same Google account and sync using the Drive backup.
