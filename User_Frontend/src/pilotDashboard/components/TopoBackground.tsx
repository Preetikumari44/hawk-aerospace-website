import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

/**
 * Very subtle, low-contrast topographic/map contour texture used behind
 * the Hawk Aerospace surfaces (matches the Customer Workspace background).
 * Tiled via repeated rows so it scales to any screen size without
 * distorting or becoming a "busy" image background.
 */
const ContourRow: React.FC<{ opacity: number; offset: number }> = ({ opacity, offset }) => (
  <Svg width="100%" height="140" viewBox="0 0 900 140" style={{ opacity }} preserveAspectRatio="none">
    <Path
      d={`M0 ${70 + offset} C 100 ${20 + offset}, 200 ${120 + offset}, 300 ${60 + offset} S 500 ${10 + offset}, 620 ${80 + offset} S 820 ${40 + offset}, 900 ${70 + offset}`}
      stroke={colors.forestGreen}
      strokeWidth={1.1}
      fill="none"
    />
  </Svg>
);

const TopoBackground: React.FC<{ style?: ViewStyle; variant?: 'light' | 'dark' }> = ({ style }) => {
  const rows = new Array(8).fill(0);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, style]}>
      {rows.map((_, i) => (
        <ContourRow key={i} opacity={0.035} offset={i % 2 === 0 ? 0 : 45} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});

export default TopoBackground;
