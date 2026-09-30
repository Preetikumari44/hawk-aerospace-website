import React from 'react';
import { View, Text, Pressable, StyleSheet , Image} from 'react-native';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';



import COLORS from '../constants/colors';
import TYPOGRAPHY from '../constants/typography';

import { useLanguage } from '../../i18n';

const TimeSlotSelector = ({ selectedService, selectedSlots, setSelectedSlots }) => {
  const { t } = useLanguage();

  const slots = selectedService === 'Videography'
    ? [
        { title: 'Morning', time: '(8AM - 1PM)', icon: require('../assets/Icons/WeatherIcons/SunnyIcon.png') },
        { title: 'Evening', time: '(2PM - 6PM)', icon: require('../assets/Icons/WeatherIcons/PartlyCloudyIcon.png') },
        { title: 'Night', time: '(After 6PM)', icon: require('../assets/Icons/WeatherIcons/NightIcon.png') },
      ]
    : [
        { title: 'Morning', time: '(8AM - 1PM)', icon: require('../assets/Icons/WeatherIcons/SunnyIcon.png') },
        { title: 'Evening', time: '(2PM - 6PM)', icon: require('../assets/Icons/WeatherIcons/PartlyCloudyIcon.png') },
      ];

  // const toggleSlot = slot => {
  //   if (selectedSlots.includes(slot)) {
  //     setSelectedSlots(selectedSlots.filter(item => item !== slot));
  //   } else {
  //     setSelectedSlots([...selectedSlots, slot]);
  //   }
  // };

  const handleSlotSelect = slot => {
    // 🔥 Single-Choice aur Compulsory Logic:
    // Hamesha naya slot set hoga, aur wapas click karne par deselect nahi hoga!
    setSelectedSlots([slot]);
  };


  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('Choose Time Slot')}</Text>

      <View style={styles.row}>
        {slots.map(slot => {
          // Check if this slot exists in the array
          const isSelected = selectedSlots.includes(slot.title);

          return (
            <Pressable
              key={slot.title}
              style={[styles.card, isSelected ? styles.selectedCard : null]}
              onPress={() => handleSlotSelect(slot.title)}
            >
              {/*<Text style={styles.label}>{t('Select Time Slot')}</Text>*/}

              <View style={styles.slotTitleRow}>
                <Text style={[styles.slotTitle, isSelected ? styles.selectedTitle : null]}>
                  {slot.title}
                </Text>
                
                {/* 🔥 Custom PNG Icon lagaya */}
                <Image 
                  source={slot.icon} 
                  style={styles.weatherIcon} 
                />
              </View>

              <Text style={styles.slotTime}>{slot.time}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 8,
    //marginBottom: 10,
  },
  heading: {
    // fontSize: 18,
    ...TYPOGRAPHY.titleMediumEmphasized,
    fontWeight: 'bold',
    color: '#2F3542',
    //marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    //width: '47%', // Fixed percentage stops the "Night" card from stretching
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: COLORS.primary, // Only changes the border, no background color
  },
  label: {
    color: '#6B7280',
    fontSize: 13, // Made slightly bigger
    fontWeight: '600',
  },
  slotTitleRow: {
    //marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F3542',
  },
  selectedTitle: {
    color: COLORS.primary,
  },
  slotTime: {
    marginTop: 4,
    fontSize: 12, // Bumped up text size
    color: '#2F3542',
    fontWeight: '500',
  },
  weatherIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
});

export default TimeSlotSelector;