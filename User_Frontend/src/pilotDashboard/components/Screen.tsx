import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { spacing } from '../theme/theme';

export const Screen: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => (
  <View style={[styles.container, style]}>{children}</View>
);

export const Row: React.FC<{ children: React.ReactNode; wrap?: boolean; gap?: number; style?: StyleProp<ViewStyle> }> = ({
  children,
  wrap = true,
  gap = spacing.lg,
  style,
}) => <View style={[styles.row, wrap && styles.wrap, { gap }, style]}>{children}</View>;

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  row: { flexDirection: 'row' },
  wrap: { flexWrap: 'wrap' },
});
