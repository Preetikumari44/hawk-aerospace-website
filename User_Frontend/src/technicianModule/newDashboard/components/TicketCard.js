import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';
import EmptyState from './EmptyState';

// Ready to render real ticket info once API data exists; falls back to a
// compact empty state (per current reference data: no active/next ticket).
export default function TicketCard({ title, ticket, emptyMessage }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {ticket ? (
        <View>
          <Text style={styles.ticketTitle}>{ticket.title}</Text>
          <Text style={styles.ticketMeta}>{ticket.meta}</Text>
        </View>
      ) : (
        <EmptyState message={emptyMessage} icon="•" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginRight: spacing.md,
  },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  ticketTitle: { ...typography.bodyMedium, color: colors.textPrimary },
  ticketMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
