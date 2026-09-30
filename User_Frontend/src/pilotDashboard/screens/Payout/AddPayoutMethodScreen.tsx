import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, typography } from '../../theme/theme';
import { Screen } from '../../components/Screen';
import { Card, Button, Badge } from '../../components/ui';
import { pilotService } from '../../services/pilotService';
import { PayoutMethodType } from '../../types';

interface AddPayoutMethodScreenProps {
  onBack: () => void;
  onSaved: () => void;
}

const Field: React.FC<{ label: string; value: string; onChangeText: (v: string) => void; placeholder?: string }> = ({
  label,
  value,
  onChangeText,
  placeholder,
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={styles.input}
    />
  </View>
);

const AddPayoutMethodScreen: React.FC<AddPayoutMethodScreenProps> = ({ onBack, onSaved }) => {
  const [methodType, setMethodType] = useState<PayoutMethodType>('bank');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const canSave = methodType === 'bank' ? accountHolderName && accountNumber && ifsc : !!upiId;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload =
        methodType === 'bank'
          ? { type: 'bank', accountHolderName, accountNumber, ifsc, label: `Bank •••• ${accountNumber.slice(-4)}` }
          : { type: 'upi', upiId, label: upiId };
      const created = await pilotService.addPayoutMethod(payload);
      setSavedId(created.id);
      setVerificationStatus('pending');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!savedId) return;
    await pilotService.verifyPayoutMethod(savedId);
    setVerificationStatus('verified');
  };

  return (
    <Screen>
      <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.backLink}>← Back to Earnings</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Add Payout Method</Text>

      <Card style={{ maxWidth: 480 }}>
        <View style={styles.typeSwitch}>
          <TouchableOpacity style={[styles.typeChip, methodType === 'bank' && styles.typeChipActive]} onPress={() => setMethodType('bank')}>
            <Text style={[styles.typeChipText, methodType === 'bank' && styles.typeChipTextActive]}>Bank Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeChip, methodType === 'upi' && styles.typeChipActive]} onPress={() => setMethodType('upi')}>
            <Text style={[styles.typeChipText, methodType === 'upi' && styles.typeChipTextActive]}>UPI</Text>
          </TouchableOpacity>
        </View>

        {methodType === 'bank' ? (
          <>
            <Field label="Account Holder Name" value={accountHolderName} onChangeText={setAccountHolderName} placeholder="As per bank records" />
            <Field label="Account Number" value={accountNumber} onChangeText={setAccountNumber} placeholder="Enter account number" />
            <Field label="IFSC Code" value={ifsc} onChangeText={setIfsc} placeholder="e.g. HDFC0001234" />
          </>
        ) : (
          <Field label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="name@upi" />
        )}

        {!!savedId && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Verification status</Text>
            <Badge
              label={verificationStatus === 'verified' ? 'Verified' : verificationStatus === 'pending' ? 'Pending' : 'Unverified'}
              tone={verificationStatus === 'verified' ? 'success' : verificationStatus === 'pending' ? 'warning' : 'neutral'}
            />
          </View>
        )}

        <View style={styles.actionRow}>
          {!savedId ? (
            <>
              <Button label="Save Payout Method" variant="primary" disabled={!canSave || saving} onPress={handleSave} fullWidth />
              <Button label="Cancel" variant="outline" onPress={onBack} fullWidth />
            </>
          ) : verificationStatus !== 'verified' ? (
            <>
              <Button label="Verify Payout Method" variant="primary" onPress={handleVerify} fullWidth />
              <Button label="Done" variant="secondary" onPress={onSaved} fullWidth />
            </>
          ) : (
            <Button label="Done" variant="primary" onPress={onSaved} fullWidth />
          )}
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  backLink: { ...typography.smallMedium, color: colors.forestGreen, marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xl },
  typeSwitch: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  typeChip: { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.creamBackgroundAlt, alignItems: 'center' },
  typeChipActive: { backgroundColor: colors.mintGreenSoft },
  typeChipText: { ...typography.smallMedium, color: colors.textSecondary },
  typeChipTextActive: { color: colors.forestGreen },
  field: { marginBottom: spacing.lg },
  fieldLabel: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.creamBackground,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  statusLabel: { ...typography.small, color: colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});

export default AddPayoutMethodScreen;
