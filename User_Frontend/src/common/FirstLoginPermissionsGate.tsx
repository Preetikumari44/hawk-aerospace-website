import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

import {
  hasRequestedPermissions,
  markPermissionsRequested,
  requestAppPermissions,
} from '../utils/permissions';
import { useLanguage } from '../i18n';

interface FirstLoginPermissionsGateProps {
  children: React.ReactNode;
}

/**
 * Rendered around every module's Home screen. On the very first login it
 * requests all app permissions (notifications, location, files, calls) once.
 * Afterwards it simply renders its children.
 */
const FirstLoginPermissionsGate: React.FC<FirstLoginPermissionsGateProps> = ({ children }) => {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const alreadyRequested = await hasRequestedPermissions();
        if (!alreadyRequested) {
          await requestAppPermissions();
        }
      } catch (error) {
        console.warn('[Permissions] Failed to request app permissions', error);
      } finally {
        await markPermissionsRequested();
        if (mounted) {
          setReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (ready) {
    return <>{children}</>;
  }

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#5060D3" />
      <Text style={styles.text}>{t('Setting up your permissions...')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontSize: 15,
    color: '#6B7280',
    fontFamily: 'Roboto-Regular',
  },
});

export default FirstLoginPermissionsGate;
