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

## Troubleshooting

- `pod install` auth error → your `sk.` token is missing or lacks `DOWNLOADS:READ`.
- Blank map → `MAPBOX_PUBLIC_TOKEN` empty in `.env`; rebuild after setting it.
- Ruby errors → confirm `rbenv local 3.3.5` took effect (`ruby -v`).
