import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useLanguage } from '../i18n';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownSelectProps {
  label: string;
  value?: string;
  options: DropdownOption[];
  placeholder?: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Reusable "tap to open a list" dropdown. Opens a small modal with the options.
 */
const DropdownSelect: React.FC<DropdownSelectProps> = ({
  label,
  value,
  options,
  placeholder,
  onSelect,
  disabled,
  required,
}) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {t(label)}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.85}
      >
        <Text
          style={selected ? styles.valueText : styles.placeholderText}
          numberOfLines={1}
        >
          {selected?.label || placeholder || t('Select an option')}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t(label)}</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const isActive = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.optionRow, isActive && styles.optionRowActive]}
                    onPress={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, isActive && styles.optionTextActive]} numberOfLines={2}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
              {options.length === 0 && (
                <Text style={styles.emptyText}>{t('No options available')}</Text>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', gap: 8 },
  label: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  required: { color: '#EF4444' },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: { backgroundColor: '#F3F4F6' },
  valueText: { fontSize: 15, color: '#111827', flex: 1 },
  placeholderText: { fontSize: 15, color: '#9CA3AF', flex: 1 },
  chevron: { fontSize: 18, color: '#6B7280', marginLeft: 8 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    maxHeight: '65%',
  },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  list: { flexGrow: 0 },
  optionRow: {
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  optionRowActive: { backgroundColor: '#EEF0FF' },
  optionText: { fontSize: 15, color: '#374151' },
  optionTextActive: { color: '#5060D3', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 24 },
});

export default DropdownSelect;
