import React from 'react';
import { Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { theme } from '@/theme';

/**
 * Shown when a signed-out user tries to open a members-only area (e.g. the
 * Character Store). Explains that an account is required and sends them to the
 * web Sign In / Sign Up pages.
 *
 * The web auth URL comes from app config (`extra.webAuthUrl`, from WEB_AUTH_URL).
 * If it isn't configured yet, the buttons explain that instead of failing
 * silently — matching the app's "degrade gracefully if not set up" convention.
 */
const WEB_AUTH_URL: string =
  (Constants.expoConfig?.extra as { webAuthUrl?: string } | undefined)?.webAuthUrl ?? '';

async function openAuth(path: '/login' | '/signup') {
  if (!WEB_AUTH_URL) {
    Alert.alert(
      'Sign-in not configured',
      'Set WEB_AUTH_URL in your .env to point at the Map WRLD account pages, then rebuild.',
    );
    return;
  }
  const url = WEB_AUTH_URL.replace(/\/$/, '') + path;
  const ok = await Linking.canOpenURL(url);
  if (ok) await Linking.openURL(url);
  else Alert.alert('Could not open', url);
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AuthGateModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🔒</Text>
          <Text style={styles.title}>Members only</Text>
          <Text style={styles.body}>
            Sign in to a Map WRLD account to browse the Character Store, unlock new characters, and
            switch map styles. Signed-out drivers keep the default character and map.
          </Text>

          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => openAuth('/signup')}>
            <Text style={styles.btnPrimaryText}>Create an account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => openAuth('/login')}>
            <Text style={styles.btnSecondaryText}>I already have an account</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.dismiss}>
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emoji: { fontSize: 38, marginBottom: 6 },
  title: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 10 },
  body: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 22 },
  btn: { width: '100%', paddingVertical: 14, borderRadius: theme.radius.sm, alignItems: 'center', marginBottom: 10 },
  btnPrimary: { backgroundColor: theme.colors.accent },
  btnPrimaryText: { color: theme.colors.onAccent, fontWeight: '800', fontSize: 15 },
  btnSecondary: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  btnSecondaryText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 },
  dismiss: { marginTop: 6, padding: 8 },
  dismissText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
});
