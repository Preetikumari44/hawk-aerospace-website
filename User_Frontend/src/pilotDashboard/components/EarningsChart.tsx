import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/theme';
import { EarningsPoint } from '../types';

interface EarningsChartProps {
  data: EarningsPoint[];
  height?: number;
}

const EarningsChart: React.FC<EarningsChartProps> = ({ data, height = 180 }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 28;
  const gap = 18;
  const chartWidth = data.length * (barWidth + gap);

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`} preserveAspectRatio="xMidYMax meet">
        <Line x1={0} y1={height - 24} x2={chartWidth} y2={height - 24} stroke={colors.border} strokeWidth={1} />
        {data.map((d, i) => {
          const barHeight = Math.max((d.value / max) * (height - 44), 4);
          const x = i * (barWidth + gap) + gap / 2;
          const y = height - 24 - barHeight;
          return <Rect key={d.label} x={x} y={y} width={barWidth} height={barHeight} rx={6} fill={colors.forestGreen} opacity={0.85} />;
        })}
      </Svg>
      <View style={styles.labelRow}>
        {data.map((d) => (
          <Text key={d.label} style={styles.label}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingHorizontal: 4 },
  label: { ...typography.caption, color: colors.textMuted, textTransform: 'none' },
});

export default EarningsChart;
