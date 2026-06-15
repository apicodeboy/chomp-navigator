# Chomp Navigator

A turn-by-turn navigation app with an arcade twist: an original chomping-circle
character (your own art — **not** Pac-Man) eats its way along the route. The road
ahead renders as pellets; pellets behind the character vanish as it passes them.

Built with Expo + `@rnmapbox/maps` + the Mapbox Directions API + `expo-location` +
Turf.js, in TypeScript. iOS-first, Android-compatible.

> **Why not the Mapbox Navigation SDK?** Its turnkey UI takes over the whole screen,
> which would hide the map and the character. So the turn-by-turn logic (routing,
> progress, off-route reroute) is built here on top of the map instead — giving us
> full control over the pellet-eating visual.

## 1. Install

```bash
cd my-maps-app
npm install
# core native + helper deps (pins Expo-compatible versions):
npx expo install @rnmapbox/maps expo-location expo-dev-client expo-status-bar
npm install @turf/turf
```

## 2. Add your Mapbox tokens

```bash
cp .env.example .env
```

Then edit `.env`:

- `MAPBOX_PUBLIC_TOKEN` — your **public** token (`pk.…`). Used at runtime.
  **Before shipping, create a fresh token and add a URL/app restriction.**
- `MAPBOX_DOWNLOAD_TOKEN` — a **secret** token (`sk.…`) with the **`DOWNLOADS:READ`**
  scope. Used only by the build to download the native iOS SDK. Never ship it.

Both come from your Mapbox account → **Tokens**.

## 3. Build a dev client (Mapbox needs native code — Expo Go won't work)

```bash
npm run sprite          # regenerate the placeholder character sprite (optional)
npx expo prebuild --clean
npx expo run:ios        # needs Xcode + CocoaPods installed; first build is slow
```

For Android: `npx expo run:android`.

Run on a **physical device** to get real GPS. The iOS Simulator can fake a moving
location via **Debug → Simulate Location → Freeway Drive**.

## 4. How the pellet "eating" works (the novel part)

- On route load, [buildPellets](src/utils/geo.ts) places a point every
  `PELLET_SPACING_M` meters and bakes each pellet's `distAlong` (meters from the
  route start) into it. This array never changes while driving.
- Every GPS fix, [useNavigation](src/hooks/useNavigation.ts) snaps you to the route
  and computes your `distAlong`.
- [RouteLayers](src/components/RouteLayers.tsx) hands all pellets to one ShapeSource
  and uses a GPU `filter` — `['>', ['get','distAlong'], characterDist]` — so only
  pellets *ahead* of the character draw. Passed pellets just stop rendering: eaten.
  No per-frame JS geometry, just one number changing.

## 5. Before you ship — replace these

| Item | File | Note |
|------|------|------|
| Character art | `assets/chomper.png` | Placeholder geometry. Use your **own original** sprite sheet (horizontal strip; update `frames`/`frameSize` in [ChomperMarker](src/components/ChomperMarker.tsx) if dimensions differ). **No trademarked characters.** |
| Public token | `.env` | Swap to a **URL/app-restricted** token. |
| Bundle IDs | `app.config.ts` | Change `com.example.chompnav` to your own. |
| Map style | `STYLE_URL` in [mapbox.ts](src/config/mapbox.ts) | Defaults to `dark-v11`; or use your own Mapbox Studio style. |

## 5·0 Theme

The app uses a central design system in [src/theme.ts](src/theme.ts) — a light
neumorphic look with a vibrant **orange** accent (`#f26101`): off-white surfaces,
soft cards, green "available/go" status. Components import `theme` instead of
hardcoding colors, and the map uses Mapbox's `light-v11` style. To restyle the whole
app, edit `theme.ts` in one place.

A browser prototype of this theme (sidebar + search/filters + map markers with score
pills + the chomping pellet route) lives in [web-demo/index.html](web-demo/index.html):
`cd web-demo && python3 -m http.server 8420` → http://localhost:8420.

## 5a. App flow & map features

A standard navigation flow, all powered by the Mapbox APIs:

1. **Idle** — full-screen map following your location ([useUserLocation](src/hooks/useUserLocation.ts)).
   [SearchPanel](src/components/SearchPanel.tsx) gives a "Where to?" box with **debounced
   live suggestions** (Geocoding v6 forward, biased to your location).
2. **Preview** — picking a result fetches a **`driving-traffic`** route, fits it on
   screen, and draws the full line + origin/destination markers
   ([PreviewLayer](src/components/PreviewLayer.tsx)). A card shows
   **traffic-aware ETA + distance**; tap **Start** to go (or **Cancel**).
3. **Navigating** — chase cam (centered, rotated to travel direction), the pellet
   route + chomping character, top maneuver banner, bottom **live ETA** (Mapbox's
   traffic duration scaled by distance remaining), 🔊/🔇 voice toggle, and a 🧭
   **recenter** button if you pan away.
4. **Arrived** — arrival card → back to idle.

Off-route → automatic reroute ([useNavigation](src/hooks/useNavigation.ts)).

## 5b. Voice + banner turn-by-turn

The route request asks Mapbox for `voice_instructions=true&banner_instructions=true`
([directions.ts](src/services/directions.ts)), so each step arrives with ready-made
prompts and their trigger distances. We just play them:

- [useVoiceGuidance](src/hooks/useVoiceGuidance.ts) speaks each step's
  `voiceInstructions[].announcement` when the remaining distance to the maneuver
  drops below its `distanceAlongGeometry` (via `expo-speech`, device TTS). 🔊/🔇 mutes it.
- [InstructionBanner](src/components/InstructionBanner.tsx) shows the step's active
  `bannerInstructions[].primary` text + arrow.

Switch `voice_units=metric` → `imperial` in [directions.ts](src/services/directions.ts)
for miles/feet. Geocoding uses the current **v6** endpoint (`search/geocode/v6/forward`).

## 6. The character store (your revenue model)

The store is real, backed by **RevenueCat** ([react-native-purchases](https://www.revenuecat.com/)):

1. **Create the products.** In App Store Connect / Play Console, add a **non-consumable**
   IAP per paid skin using the `productId`s in [skins.ts](src/store/skins.ts)
   (`chomp_skin_mint`, `chomp_skin_grape`, `chomp_skin_coral`).
2. **Wire RevenueCat.** In the RevenueCat dashboard, add each product and create an
   **entitlement** per skin matching the `entitlementId`s (`skin_mint`, …). Attach the
   product to its entitlement.
3. **Add your keys** to `.env`: `REVENUECAT_IOS_KEY` / `REVENUECAT_ANDROID_KEY`
   (the *public* SDK keys), then rebuild.
4. **iOS capability:** enable **In-App Purchase** for your app target in Xcode
   (Signing & Capabilities) — `expo prebuild` won't add it automatically.

Ownership is derived from the user's **active entitlements** (see
[purchases.ts](src/store/purchases.ts) + [useSkinStore.ts](src/store/useSkinStore.ts)) —
skins are never granted locally in production. "Restore purchases" is implemented
(required for App Store review).

> **Dev mode:** with no RevenueCat key set, `paymentsEnabled` is false and the store
> grants skins locally so you can test the flow without configuring billing. The store
> shows a "Dev mode" note so you don't ship it by accident.

### Where it plugs in

[ChomperMarker](src/components/ChomperMarker.tsx) already takes a `skin` prop
(`ChomperSkin = { sheet, frames, frameSize }`). To add a store later:
1. Ship multiple skin assets + a `skins.ts` catalog.
2. Persist the selected/owned skins (e.g. `expo-secure-store` + your IAP via
   `expo-in-app-purchases` or RevenueCat).
3. Pass the chosen skin down from `MapScreen` → `ChomperMarker`.

No navigation code needs to change to support new characters.

## Nearby feature (server-side Mapbox proxy)

Finds gas / food / EV / hotels near the user. Search requests go through our own
Edge Function so the **Search Box token never ships in the app**.

> Caveat: a native maps app must still bundle a public token for `@rnmapbox/maps`
> to render tiles on-device. Use a **separate, restricted** token for the proxy
> (URL/referrer-restricted) vs. the map-tile token (app/bundle-restricted).

### Backend — Supabase Edge Function `nearby`

Env var (a Mapbox public token used only for Search; never hardcoded):

```bash
supabase secrets set MAPBOX_TOKEN=pk.your_search_only_token
supabase functions deploy nearby --no-verify-jwt
```

Contract:

```
GET /functions/v1/nearby?lat={lat}&lng={lng}&radius={miles}&categories=gas_station,restaurant
-> 200 { "results": NearbyPlace[] }
-> 400/500/502 { "results": [], "error": "..." }

NearbyPlace = {
  id, name, category,
  coordinates: { lat, lng },
  address, distanceMiles
}
```

- `radius` defaults to **20** miles (capped at 100); `categories` is a CSV of
  Mapbox Search Box canonical ids (default `gas_station,restaurant`).
- Computes a bbox from the radius, fetches each category concurrently, then
  haversine-filters to a true circle and sorts ascending by `distanceMiles`.

### Frontend

- `src/services/nearby.ts` — `RADIUS_MILES` (change the default here), `fetchNearby()`,
  and the proxy URL (override with `NEARBY_API_URL` in `.env`, else falls back to
  this project's deployed function).
- `NearbySheet` (list + Gas/Food/EV/Hotels filter) and `NearbyMarkers` (pins on the
  existing map) wired into `MapScreen`; tapping a result uses the existing routing flow.
