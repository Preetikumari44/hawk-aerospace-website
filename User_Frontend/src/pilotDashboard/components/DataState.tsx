import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography, radii } from '../theme/theme';
import { AsyncState } from '../types';

interface DataStateProps<T> {
  state: AsyncState<T>;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyBody?: string;
  errorTitle?: string;
  children: (data: T) => React.ReactNode;
}

/**
 * Wraps a data section so every list/card group in the dashboard renders
 * a clean state for loading, loaded, empty and error — never a blank
 * white area.
 */
function DataState<T>({ state, isEmpty, emptyTitle = 'Nothing here yet', emptyBody, errorTitle = 'Something went wrong', children }: DataStateProps<T>) {
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.forestGreen} />
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>{errorTitle}</Text>
        {!!state.error && <Text style={styles.stateBody}>{state.error}</Text>}
      </View>
    );
  }
  const data = state.data as T;
  const empty = data == null || (isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0);
  if (empty) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>{emptyTitle}</Text>
        {!!emptyBody && <Text style={styles.stateBody}>{emptyBody}</Text>}
      </View>
    );
  }
  return <>{children(data)}</>;
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  stateBox: {
    backgroundColor: colors.cardWhite,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  stateTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  stateBody: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
});

export default DataState;
