import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const WEB_AUTH_URL: string =
  (Constants.expoConfig?.extra as { webAuthUrl?: string } | undefined)?.webAuthUrl ?? '';

/**
 * Account screen. The app navigates as a guest (anonymous) by default; signing in
 * happens on the web account pages (opened via WEB_AUTH_URL). If a real (non-
 * anonymous) Supabase session exists, we show the email and a Sign Out button.
 */
export default function AccountModal({ visible, onClose }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const read = (session: { user?: { email?: string; is_anonymous?: boolean } } | null) => {
      const real = !!session?.user && session.user.is_anonymous !== true;
      setSignedIn(real);
      setEmail(real ? session?.user?.email ?? null : null);
    };
    supabase.auth.getSession().then(({ data }) => read(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => read(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function openAuth(path: '/login' | '/signup') {
    if (!WEB_AUTH_URL) {
      Alert.alert('Sign-in not configured', 'Set WEB_AUTH_URL in your .env, then rebuild.');
      return;
    }
    // ?return=app tells the web pages to bounce back into the app (via the
    // mapwrlds:// scheme) after a successful sign-in.
    const url = WEB_AUTH_URL.replace(/\/$/, '') + path + '?return=app';
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert('Could not open', url);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Account</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{signedIn ? '👤' : '🙂'}</Text>
            </View>
            <Text style={styles.status}>
              {signedIn ? (email ?? 'Signed in') : 'Guest'}
            </Text>
            <Text style={styles.sub}>
              {signedIn
                ? 'You are signed in to your MAP WRLDS account.'
                : 'You are navigating as a guest. Sign in to sync your account.'}
            </Text>

            {signedIn ? (
              <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={signOut}>
                <Text style={styles.btnSecondaryText}>Sign Out</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => openAuth('/signup')}>
                  <Text style={styles.btnPrimaryText}>Create an account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => openAuth('/login')}>
                  <Text style={styles.btnSecondaryText}>Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: theme.colors.panel,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    paddingBottom: 32,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' },
  close: { color: theme.colors.textSecondary, fontSize: 22, paddingHorizontal: 4 },
  body: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 34 },
  status: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
  sub: { color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 22, lineHeight: 20 },
  btn: { width: '100%', paddingVertical: 14, borderRadius: theme.radius.sm, alignItems: 'center', marginBottom: 10 },
  btnPrimary: { backgroundColor: theme.colors.accent },
  btnPrimaryText: { color: theme.colors.onAccent, fontWeight: '800', fontSize: 15 },
  btnSecondary: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
  btnSecondaryText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 },
});
