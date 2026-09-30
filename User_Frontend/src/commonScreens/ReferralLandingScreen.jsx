import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform, Image } from 'react-native';

import ScreenContainer from '../customerModule/components/ScreenContainer';
import { getApiBaseUrl, referralApi } from '../utils/api';
import { useLanguage } from '../i18n';
import {
  extractReferralCode,
  frontendRoleForInvite,
  parseReferralFromUrl,
  savePendingReferralCode,
} from '../utils/referral';

/**
 * Public invite landing — shown on WEB when someone opens
 * http://<ec2-ip>:8081/r/HAWK-... (nginx serves index.html, App.tsx routes here).
 *
 * - Resolves the code against the backend (no login needed).
 * - Shows the code BIG for manual entry (the native app cannot read the
 *   browser's localStorage, so copy/paste is the deferred-deep-link fallback).
 * - Download APK goes straight to the backend (/api/update/download).
 */
const ReferralLandingScreen = ({ onNavigate, routeParams, code: codeProp }) => {
  const { t } = useLanguage();
  const [code, setCode] = useState(
    codeProp ?? routeParams?.code ?? extractReferralCode(routeParams?.path ?? ''),
  );
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apkUrl, setApkUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fallback: derive the code from the browser URL itself.
    if (!code && Platform.OS === 'web' && typeof window !== 'undefined') {
      const parsed = parseReferralFromUrl(window.location.href);
      if (parsed?.code) setCode(parsed.code);
      else setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await savePendingReferralCode(code);
      try {
        const base = await getApiBaseUrl();
        if (!cancelled) setApkUrl(`${base}/update/download?ref=${encodeURIComponent(code)}`);
      } catch {
        if (!cancelled) setApkUrl('');
      }
      try {
        const res = await referralApi.resolve(code);
        if (!cancelled) setInfo(res?.data ?? res);
      } catch {
        if (!cancelled) setInfo(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const copyCode = async () => {
    try {
      if (Platform.OS === 'web' && window?.navigator?.clipboard?.writeText && code) {
        await window.navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* clipboard best-effort */ }
  };

  const openInApp = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && code) {
      window.location.href = `hawk://invite?code=${encodeURIComponent(code)}`;
    }
  };

  const isCustomerInvite = !info || (info.targetRoles ?? []).includes('customer');
  const inviteFormRole = !isCustomerInvite
    ? frontendRoleForInvite((info.targetRoles ?? [])[0])
    : null;

  const fillFormNow = () => {
    if (!inviteFormRole || !code) return;
    savePendingReferralCode(code).catch(() => {});
    // Leave the /r/ path so App.tsx renders the form instead of this landing.
    try { window?.history?.replaceState?.({}, '', '/'); } catch { /* noop */ }
    if (onNavigate) {
      onNavigate('RoleApplicationFormScreen', {
        role: inviteFormRole,
        guest: true,
        referralCode: code,
      });
    }
  };

  return (
    <ScreenContainer backgroundColor="#0B1220">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Image
          source={require('../customerModule/assets/images/droneicon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.logo}>Hawk Aerosystem</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#F5A623" style={styles.loader} />
        ) : !code || !info ? (
          <View style={styles.card}>
            <Text style={styles.title}>{t('Invalid or expired invite')}</Text>
            <Text style={styles.muted}>
              {t('Ask your inviter to open Refer & Earn in the app and send you a fresh link.')}
            </Text>
            <Pressable
              style={styles.primary}
              onPress={() => {
                // Leave the /r/ path so the landing doesn't trap navigation.
                try { window?.history?.replaceState?.({}, '', '/'); } catch { /* noop */ }
                if (onNavigate) onNavigate('MobileNumberScreen');
              }}
            >
              <Text style={styles.primaryText}>{t('Go to login')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>
              {t('{{name}} invited you to Hawk Aerosystem', { name: info.inviter || 'Someone' })}
            </Text>
            <Text style={styles.muted}>
              {t('Join as {{roles}}', { roles: (info.targetRoles ?? []).join(' / ') })}
            </Text>
            <Pressable style={styles.codeBox} onPress={copyCode}>
              <Text style={styles.code}>{code}</Text>
              <Text style={styles.copyHint}>{copied ? t('Copied ✓') : t('Tap to copy')}</Text>
            </Pressable>
            <Text style={styles.muted}>
              {isCustomerInvite
                ? t('Install the app, sign up with OTP, then complete your first PAID service (cash counts once the pilot confirms). Your inviter earns automatically.')
                : t('Install the app, apply with this code, and get approved by the admin. Your inviter earns on approval.')}
            </Text>
            {!!inviteFormRole && (
              <Pressable style={styles.primary} onPress={fillFormNow}>
                <Text style={styles.primaryText}>
                  {t('Fill {{role}} application now — no login needed', { role: inviteFormRole })}
                </Text>
              </Pressable>
            )}
            {!!apkUrl && (
              <Pressable
                style={inviteFormRole ? styles.secondary : styles.primary}
                onPress={() => {
                  if (Platform.OS === 'web' && typeof window !== 'undefined') {
                    window.location.href = apkUrl;
                  }
                }}
              >
                <Text style={inviteFormRole ? styles.secondaryText : styles.primaryText}>{t('⬇ Download the app (APK)')}</Text>
              </Pressable>
            )}
            <Pressable style={styles.secondary} onPress={openInApp}>
              <Text style={styles.secondaryText}>{t('I already have the app — open it')}</Text>
            </Pressable>
            <Text style={styles.fine}>
              {t('After installing: enter the code above when asked for a referral code, or paste it in Refer & Earn → Attach.')}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  loader: { marginTop: 40 },
  logo: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  logoImage: { width: 84, height: 84, borderRadius: 20, alignSelf: 'center' },
  card: { backgroundColor: '#111C33', borderWidth: 1, borderColor: '#22345F', borderRadius: 16, padding: 24, gap: 12 },
  title: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
  muted: { fontSize: 14, color: '#9FB2D8', textAlign: 'center' },
  fine: { fontSize: 12, color: '#6B7FA8', textAlign: 'center' },
  codeBox: { backgroundColor: '#0B1220', borderWidth: 1, borderStyle: 'dashed', borderColor: '#4C6CB3', borderRadius: 10, padding: 14, alignItems: 'center', gap: 4 },
  code: { fontSize: 24, fontWeight: '800', letterSpacing: 2, color: '#F5A623' },
  copyHint: { fontSize: 12, color: '#9FB2D8' },
  primary: { backgroundColor: '#F5A623', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#111111', fontWeight: '800', fontSize: 16 },
  secondary: { borderWidth: 1, borderColor: '#4C6CB3', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default ReferralLandingScreen;
