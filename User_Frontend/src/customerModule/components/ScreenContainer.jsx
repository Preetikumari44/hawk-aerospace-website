import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import COLORS from '../constants/colors';

// Maximum content width used on the web. The customer module is a mobile-first
// design, so on tablets/laptops/desktops we keep the content in a centered
// phone-width column instead of stretching across the whole viewport. On native
// apps the screen always fills the device width (native styling is untouched).
const WEB_MAX_CONTENT_WIDTH = 800;

const IS_WEB = Platform.OS === 'web';

// ScreenContainer component that provides a safe area view with customizable background color and renders its children
const ScreenContainer = ({
  children,
  backgroundColor = COLORS.primary,
}) => {
  if (IS_WEB) {
    return (
      <View style={[styles.container, styles.webContainer, { backgroundColor }]}>
        <View style={styles.webContent}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor },
      ]}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webContainer: {
    width: '100%',
    alignItems: 'center',
  },
  webContent: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_MAX_CONTENT_WIDTH,
  },
});

export default ScreenContainer;
