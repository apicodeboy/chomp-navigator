import 'react-native-gesture-handler';
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MapScreen from '@/components/MapScreen';
import { SkinStoreProvider } from '@/store/useSkinStore';
import { TicketsProvider } from '@/store/useTickets';
import { SettingsProvider } from '@/store/useSettings';
import { theme } from '@/theme';

/**
 * Root. The map is full-screen. GestureHandlerRootView + SafeAreaProvider are
 * required by @gorhom/bottom-sheet (the Apple-style search sheet).
 * (Mapbox is initialized as a side-effect of importing src/config/mapbox via MapScreen.)
 */
export default function App() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <TicketsProvider>
          <SkinStoreProvider>
            <SettingsProvider>
              <StatusBar style="light" />
              <MapScreen />
            </SettingsProvider>
          </SkinStoreProvider>
        </TicketsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.colors.bg },
});
