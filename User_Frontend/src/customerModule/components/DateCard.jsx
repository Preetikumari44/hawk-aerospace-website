import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';

import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';
import { useLanguage } from '../../i18n';

const toDateString = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getBookingWindow = () => {
  const today = new Date();
  const min = new Date(today);
  min.setDate(today.getDate() + 1);
  const max = new Date(today);
  max.setDate(today.getDate() + 7);
  return { minDate: toDateString(min), maxDate: toDateString(max) };
};

const DateCard = ({ selectedDate, setSelectedDate }) => {
  const { t, locale } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const { minDate, maxDate } = getBookingWindow();

  const hasDate = Boolean(selectedDate);

  let formattedDate = '';
  if (hasDate) {
    const dateObject = new Date(selectedDate);
    const day = dateObject.getDate();
    const month = dateObject.toLocaleString(locale, { month: 'short' });
    const weekDay = dateObject.toLocaleString(locale, { weekday: 'short' });
    const year = dateObject.getFullYear();
    formattedDate = `${day} ${month} ${weekDay}, ${year}`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('Choose Date')}</Text>

      <Pressable style={styles.card} onPress={() => setModalVisible(true)}>
        {/*<Text style={styles.label}>{t('Select Date')}</Text>*/}
        {hasDate ? (
          <Text style={styles.date}>{formattedDate}</Text>
        ) : (
          <Text style={[styles.date, styles.datePlaceholder]}>{t('Select a date')}</Text>
        )}
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Calendar
              onDayPress={dayObj => {
                setSelectedDate(dayObj.dateString);
                setModalVisible(false);
              }}
              minDate={minDate}
              maxDate={maxDate}
              markedDates={
                hasDate
                  ? {
                    [selectedDate]: { selected: true, selectedColor: COLORS.primary },
                  }
                  : {}
              }
              theme={{
                todayTextColor: COLORS.primary,
                arrowColor: COLORS.primary,
                disabledDayTextColor: '#D1D5DB',
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 8,
  },
  heading: {
    ...TYPOGRAPHY.titleMediumEmphasized,
    color: '#2F3542',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
  },
  label: {
    ...TYPOGRAPHY.labelLargeEmphasized,
    color: COLORS.white,
    opacity: 0.9,
  },
  date: {
    ...TYPOGRAPHY.titleMediumEmphasized,
    color: COLORS.white,
  },
  datePlaceholder: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
});

export default DateCard;
