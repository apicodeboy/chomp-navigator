import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapScreen from '@/components/MapScreen';
import { SkinStoreProvider } from '@/store/useSkinStore';
import { TicketsProvider } from '@/store/useTickets';
import { SettingsProvider } from '@/store/useSettings';
import { theme } from '@/theme';

/**
 * Root. The map is full-screen; SafeAreaView keeps the top banner clear of the notch.
 * (Mapbox is initialized as a side-effect of importing src/config/mapbox via MapScreen.)
 */
export default function App() {
  return (
    <TicketsProvider>
      <SkinStoreProvider>
        <SettingsProvider>
          <SafeAreaView style={styles.fill}>
            <StatusBar style="light" />
            <MapScreen />
          </SafeAreaView>
        </SettingsProvider>
      </SkinStoreProvider>
    </TicketsProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.colors.bg },
});
