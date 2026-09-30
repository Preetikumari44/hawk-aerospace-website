import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import typography from '../theme/typography';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Reference default: Mon, Aug 17 selected within August 2025 (demo month).
const DEFAULT_YEAR = 2025;
const DEFAULT_MONTH = 7; // August (0-indexed)
const DEFAULT_DAY = 17;
const ACTIVITY_DAYS = [4, 9, 17, 22, 28]; // decorative activity dots

export default function CalendarCard({ onSelectDate }) {
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [selectedDay, setSelectedDay] = useState(DEFAULT_DAY);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const selectedLabel = `${shortWeekday(year, month, selectedDay)}, ${MONTH_NAMES[month].slice(0, 3)} ${selectedDay}`;

  const goPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else { setMonth(month - 1); }
  };
  const goNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else { setMonth(month + 1); }
  };

  const selectDay = (day) => {
    setSelectedDay(day);
    if (onSelectDate) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      onSelectDate(key);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Manage your Schedule</Text>
        <Text style={styles.selectedDate}>{selectedLabel}</Text>
      </View>

      <View style={styles.monthRow}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn}>
          <Text style={styles.navGlyph}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={goNextMonth} style={styles.navBtn}>
          <Text style={styles.navGlyph}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={`${w}-${i}`} style={styles.weekLabel}>{w}</Text>
        ))}
      </View>

      {grid.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            const isSelected = day === selectedDay;
            const hasActivity = day && ACTIVITY_DAYS.includes(day);
            return (
              <TouchableOpacity
                key={di}
                style={styles.dayCell}
                disabled={!day}
                onPress={() => day && selectDay(day)}
                activeOpacity={0.7}
              >
                {day ? (
                  <View style={[styles.dayInner, isSelected && styles.dayInnerSelected]}>
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                    {hasActivity ? <View style={[styles.dot, isSelected && styles.dotSelected]} /> : null}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function shortWeekday(year, month, day) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[new Date(year, month, day).getDay()];
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm },
  title: { ...typography.h3, color: colors.textPrimary },
  selectedDate: { ...typography.caption, color: colors.forestGreen, fontWeight: '600' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  navBtn: { paddingHorizontal: spacing.md },
  navGlyph: { fontSize: 16, color: colors.forestGreen },
  monthLabel: { ...typography.bodyMedium, color: colors.textPrimary, minWidth: 120, textAlign: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekLabel: { ...typography.caption, color: colors.textMuted, width: 24, textAlign: 'center', marginBottom: 4 },
  dayCell: { width: 24, height: 26, alignItems: 'center', justifyContent: 'center' },
  dayInner: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dayInnerSelected: { backgroundColor: colors.forestGreen },
  dayText: { ...typography.caption, color: colors.textPrimary },
  dayTextSelected: { color: colors.white, fontWeight: '700' },
  dot: { position: 'absolute', bottom: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.mint },
  dotSelected: { backgroundColor: colors.mint },
});
