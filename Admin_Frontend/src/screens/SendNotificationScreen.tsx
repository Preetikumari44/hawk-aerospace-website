import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { api } from '../api/client';

const ROLES = [
  { label: 'All Users', value: '' },
  { label: 'Customers', value: 'customer' },
  { label: 'Pilots', value: 'pilot' },
  { label: 'Fleet Managers', value: 'fleet_manager' },
  { label: 'Technicians', value: 'technician' },
  { label: 'Sales Aggregators', value: 'aggregator' },
];

export default function SendNotificationScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Title and message are required.');
      } else {
        Alert.alert('Validation', 'Title and message are required.');
      }
      return;
    }

    setLoading(true);
    setLastResult(null);

    try {
      const body: Record<string, any> = { title: title.trim(), message: message.trim() };
      if (selectedRole) body.role = selectedRole;

      await api.post('/notifications/broadcast', body);

      const roleLabel = ROLES.find((r) => r.value === selectedRole)?.label ?? 'All Users';
      setLastResult(`Notification sent to ${roleLabel}`);
      setTitle('');
      setMessage('');
    } catch (e: any) {
      setLastResult(`Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showPreview = title.length > 0 || message.length > 0;
  const isSuccess = lastResult !== null && !lastResult.startsWith('Failed');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{'Send Notification'}</Text>
      <Text style={styles.subheading}>{'Broadcast a push notification to users by role.'}</Text>

      <Text style={styles.label}>{'Target Role'}</Text>
      <View style={styles.roleRow}>
        {ROLES.map((role) => {
          const isActive = selectedRole === role.value;
          return (
            <TouchableOpacity
              key={role.value}
              style={isActive ? [styles.roleChip, styles.roleChipActive] : styles.roleChip}
              onPress={() => setSelectedRole(role.value)}
            >
              <Text style={isActive ? [styles.roleChipText, styles.roleChipTextActive] : styles.roleChipText}>
                {role.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>{'Title'}</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. New service added!"
        placeholderTextColor="#9CA3AF"
        maxLength={100}
      />

      <Text style={styles.label}>{'Message'}</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={message}
        onChangeText={setMessage}
        placeholder="e.g. We've added aerial mapping. Book now!"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={4}
        maxLength={500}
      />

      {showPreview && (
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>{'PREVIEW'}</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{title || '(no title)'}</Text>
            <Text style={styles.previewBody}>{message || '(no message)'}</Text>
          </View>
        </View>
      )}

      {lastResult !== null && (
        <Text style={isSuccess ? [styles.result, styles.success] : [styles.result, styles.error]}>
          {lastResult}
        </Text>
      )}

      <TouchableOpacity
        style={loading ? [styles.sendButton, styles.sendButtonDisabled] : styles.sendButton}
        onPress={handleSend}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.sendButtonText}>{'Send Notification'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, paddingBottom: 48 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap' },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  roleChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  roleChipText: { fontSize: 13, color: '#374151' },
  roleChipTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  preview: { marginTop: 20 },
  previewLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
  previewCard: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  previewBody: { fontSize: 13, color: '#D1D5DB' },
  result: { marginTop: 16, fontSize: 14, fontWeight: '500' },
  success: { color: '#059669' },
  error: { color: '#DC2626' },
  sendButton: { marginTop: 28, backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
