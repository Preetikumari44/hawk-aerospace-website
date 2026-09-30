import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useLanguage } from '../i18n';

interface DateTimePickerModalProps {
  visible: boolean;
  initialValue?: string | null;
  onConfirm: (isoDateTime: string) => void;
  onClose: () => void;
  title?: string;
}

const toLocalDateString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Date + time picker modal. Uses a calendar for the date and steppers for the
 * time (hour/minute), because no native time picker is available.
 */
const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({
  visible,
  initialValue,
  onConfirm,
  onClose,
  title,
}) => {
  const { t, locale } = useLanguage();
  const [dateIso, setDateIso] = useState('');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (initialValue) {
      const d = new Date(initialValue);
      if (!Number.isNaN(d.getTime())) {
        setDateIso(toLocalDateString(d));
        setHour(d.getHours());
        setMinute(d.getMinutes());
        return;
      }
    }
    const now = new Date();
    setDateIso(toLocalDateString(now));
    setHour(now.getHours());
    setMinute(now.getMinutes());
  }, [visible, initialValue]);

  const todayIso = toLocalDateString(new Date());

  const shiftHour = (delta: number) => {
    setHour((prev) => (prev + delta + 24) % 24);
  };
  const shiftMinute = (delta: number) => {
    setMinute((prev) => (prev + delta + 60) % 60);
  };

  const handleConfirm = () => {
    if (!dateIso) return;
    const iso = `${dateIso}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    onConfirm(iso);
  };

  const displayDate = dateIso
    ? new Date(dateIso).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t(title || 'Select Date & Time')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <Calendar
            current={dateIso}
            onDayPress={(day) => setDateIso(day.dateString)}
            maxDate={todayIso}
            markedDates={
              dateIso ? { [dateIso]: { selected: true, selectedColor: '#5060D3', disableTouchEvent: true } } : {}
            }
            theme={{
              selectedDayBackgroundColor: '#5060D3',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#5060D3',
              arrowColor: '#5060D3',
              textSectionTitleColor: '#5060D3',
              monthTextColor: '#2F3542',
            }}
          />

          <View style={styles.timeRow}>
            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>{t('Hour')}</Text>
              <View style={styles.stepperRow}>
                <Pressable style={styles.stepperBtn} onPress={() => shiftHour(-1)} hitSlop={6}>
                  <Text style={styles.stepperText}>−</Text>
                </Pressable>
                <Text style={styles.timeValue}>{String(hour).padStart(2, '0')}</Text>
                <Pressable style={styles.stepperBtn} onPress={() => shiftHour(1)} hitSlop={6}>
                  <Text style={styles.stepperText}>+</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.colon}>:</Text>

            <View style={styles.timeGroup}>
              <Text style={styles.timeLabel}>{t('Minute')}</Text>
              <View style={styles.stepperRow}>
                <Pressable style={styles.stepperBtn} onPress={() => shiftMinute(-1)} hitSlop={6}>
                  <Text style={styles.stepperText}>−</Text>
                </Pressable>
                <Text style={styles.timeValue}>{String(minute).padStart(2, '0')}</Text>
                <Pressable style={styles.stepperBtn} onPress={() => shiftMinute(1)} hitSlop={6}>
                  <Text style={styles.stepperText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.selectedSummary}>
            {t('Selected: ')}
            <Text style={styles.selectedBold}>
              {displayDate}, {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </Text>
          </Text>

          <View style={styles.actionsRow}>
            <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelText}>{t('Cancel')}</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.doneBtn]} onPress={handleConfirm}>
              <Text style={styles.doneText}>{t('Done')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  close: { fontSize: 20, color: '#4B5563', fontWeight: '600' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 16,
  },
  timeGroup: { alignItems: 'center', gap: 6 },
  timeLabel: { fontSize: 12, color: '#6B7280' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: { fontSize: 20, color: '#5060D3', fontWeight: '700' },
  timeValue: { fontSize: 22, fontWeight: '700', color: '#111827', minWidth: 40, textAlign: 'center' },
  colon: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 18 },
  selectedSummary: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 15,
    color: '#4B5563',
  },
  selectedBold: { color: '#111827', fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelText: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
  doneBtn: { backgroundColor: '#5060D3' },
  doneText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default DateTimePickerModal;
