# Building the iOS app (one-time local setup)

The JS/TS is installed and typechecks (`npm install` ✓, `npm run tsc` ✓) and the
native projects are generated (`ios/`, `android/`). To actually build/run on iOS
you need two things this repo can't provide for you: a modern Ruby + CocoaPods,
and your real Mapbox secret token.

## 1. Modern Ruby (system Ruby 2.6 is too old for CocoaPods)

```bash
# Install Homebrew if you don't have it: https://brew.sh
brew install rbenv
rbenv install 3.3.5        # matches .ruby-version in this repo
rbenv local 3.3.5
gem install cocoapods
```

(Or simply `brew install cocoapods`, which brings its own Ruby.)

Verify: `pod --version` should print 1.15+.

## 2. Real Mapbox tokens in `.env`

```bash
# .env  (already gitignored)
MAPBOX_PUBLIC_TOKEN=pk.your_real_public_token        # runtime; URL-restrict before shipping
MAPBOX_DOWNLOAD_TOKEN=sk.your_secret_token_DOWNLOADS_READ   # build-only, needs DOWNLOADS:READ scope
# Optional — leave blank to run the store in dev mode:
REVENUECAT_IOS_KEY=
REVENUECAT_ANDROID_KEY=
```

The `sk.` token is what lets CocoaPods download the native Mapbox SDK. Without it,
`pod install` fails on the Mapbox dependency.

## 3. Build & run

```bash
npx expo prebuild --clean    # re-injects the real download token into ios/Podfile
npx expo run:ios             # runs pod install, builds, launches on simulator/device
```

Run on a **physical device** for real GPS. On the simulator, fake movement with
**Debug → Simulate Location → Freeway Drive**.

## Fast path — EAS Build (no local CocoaPods/Ruby/Xcode needed) ⚡

This app **cannot run in Expo Go** — it uses `@rnmapbox/maps`, a native module not
bundled in Expo Go, so an `expo start` QR scanned with Expo Go will crash on launch.
You need a **development build** (a custom dev client). The fastest way to get one
without fighting local CocoaPods/Ruby is to let Expo build it in the cloud:

```bash
# 1. one-time account + project link
npm i -g eas-cli         # or use: npx eas-cli@latest <cmd>
eas login                # your Expo account
eas init                 # writes the EAS projectId into app config

# 2. give the cloud build your Mapbox tokens (so the native SDK can download)
eas env:create --name MAPBOX_PUBLIC_TOKEN   --value pk.your_public_token   --visibility plaintext
eas env:create --name MAPBOX_DOWNLOAD_TOKEN --value sk.your_secret_token    --visibility secret

# 3. build the dev client in the cloud (~10–20 min; needs your Apple account for iOS)
eas build --profile development --platform ios       # real device
#   ...or for the iOS Simulator:
eas build --profile development-simulator --platform ios

# 4. install the build it gives you (scan its QR / install link), then:
npx expo start --dev-client
```

Step 4's `expo start --dev-client` prints **the QR you actually want** — scan it with
your phone's camera and the dev client opens with live JS reload. After the one-time
dev-client install, every code change is instant (no rebuild). `eas.json` in this repo
already defines the `development`, `development-simulator`, `preview`, and `production`
profiles.

> No Apple Developer account yet? Use `--platform android` instead — EAS produces an
> `.apk` you can install directly, no developer account required.

## Troubleshooting

- `pod install` auth error → your `sk.` token is missing or lacks `DOWNLOADS:READ`.
- Blank map → `MAPBOX_PUBLIC_TOKEN` empty in `.env`; rebuild after setting it.
- Ruby errors → confirm `rbenv local 3.3.5` took effect (`ruby -v`).
