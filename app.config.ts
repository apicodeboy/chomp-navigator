import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

/**
 * Expo config as TS so we can pull tokens from .env (never hardcode them).
 *
 * Two different Mapbox tokens are involved:
 *  - MAPBOX_PUBLIC_TOKEN  (pk.…) : used at RUNTIME by the app. URL/app-restrict it before shipping.
 *  - MAPBOX_DOWNLOAD_TOKEN (sk.…) : used only at BUILD time to download the native iOS SDK.
 *                                    Needs the DOWNLOADS:READ scope. Do NOT ship this.
 */
const PUBLIC_TOKEN = process.env.MAPBOX_PUBLIC_TOKEN ?? '';
const DOWNLOAD_TOKEN = process.env.MAPBOX_DOWNLOAD_TOKEN ?? '';

const config: ExpoConfig = {
  name: 'Map WRLD',
  slug: 'map-wrld',
  owner: 'apicodeboy',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'mapwrld',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.example.mapwrld', // ⬅️ change to your own reverse-domain id
    infoPlist: {
      // Required so iOS lets us read live GPS during navigation.
      NSLocationWhenInUseUsageDescription:
        'Map WRLD uses your location to guide you turn-by-turn.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Map WRLD uses your location to keep navigating in the background.',
      UIBackgroundModes: ['location'],
    },
  },
  android: {
    package: 'com.example.mapwrld', // ⬅️ change to your own
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
    ],
  },
  plugins: [
    'expo-dev-client',
    [
      // Pin Android Kotlin to 1.9.25 — expo-modules-core's Compose Compiler 1.5.15
      // requires it (SDK 52's default 1.9.24 fails compileDebugKotlin).
      'expo-build-properties',
      {
        android: { kotlinVersion: '1.9.25' },
      },
    ],
    [
      '@rnmapbox/maps',
      {
        // The native SDK download needs the SECRET token at build time.
        RNMapboxMapsDownloadToken: DOWNLOAD_TOKEN,
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Map WRLD uses your location to guide you turn-by-turn.',
      },
    ],
  ],
  // Exposed to JS at runtime via Constants.expoConfig.extra
  extra: {
    mapboxPublicToken: PUBLIC_TOKEN,
    // RevenueCat public SDK keys (safe to ship — they're client keys).
    rcIosKey: process.env.REVENUECAT_IOS_KEY ?? '',
    rcAndroidKey: process.env.REVENUECAT_ANDROID_KEY ?? '',
    // Supabase (Tickets backend). Public anon key only — safe in the client.
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    eas: { projectId: '641a1b7b-9ffd-4fa0-b5fd-4a1c08b31ae5' },
  },
};

export default config;
