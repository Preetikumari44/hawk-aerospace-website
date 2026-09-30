import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import CrossPlatformGradient from '../../common/CrossPlatformGradient';
import { useLanguage } from '../../i18n';

const BookingStatusCard = ({
  currentStep = 0,
  title,
  description,
  showPilotInfo = false,
  pilotName = '',
  droneImage = require('../assets/images/droneicon1.png'),
  profileImage = require('../assets/images/role_drone_pilot.png'),
  callImage = require('../assets/images/support_phone.png'),
  messageImage = require('../assets/images/CallButton.png'),
  onMessagePress,
  isCompleted = false, // Stage 7 ke liye
}) => {
  const { t, locale } = useLanguage();
  const steps = [0, 1, 2, 3, 4];

  const gradientColors = isCompleted
    ? ['#5A64C3', '#3A4287']
    : ['#2B32B2', '#141852'];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.heading}>{t('Booking Status')}</Text>

      <CrossPlatformGradient colors={gradientColors} style={styles.card}>
        <View style={styles.progressRow}>
          {steps.map((step, index) => (
            <React.Fragment key={step}>

              {/* Naya Wrapper Drone aur uske neeche wale text ke liye */}
              <View style={styles.nodeWrapper}>
                <View
                  style={[
                    styles.circle,
                    step < currentStep && styles.completedCircle,
                    step === currentStep && styles.currentCircle,
                  ]}
                >
                  {step === currentStep && droneImage && (
                    <Image
                      source={droneImage}
                      style={styles.drone}
                      resizeMode="contain"
                    />
                  )}
                </View>

                {/* Yahi FIX kiya hai: Text directly drone ke neeche */}
                {step === currentStep && (
                  <Text
                    style={[
                      styles.activeTitle,
                      step === 0 && { left: -10, textAlign: 'left' },
                      step === 4 && { left: undefined, right: -10, textAlign: 'right' }
                    ]}
                  >
                    {title}
                  </Text>
                )}
              </View>

              {index !== steps.length - 1 && (
                <View
                  style={[
                    styles.line,
                    index < currentStep && styles.activeLine,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Pilot Info INSIDE the blue card */}
        {showPilotInfo && (
          <View style={styles.pilotSection}>
            <Text style={styles.assignedText}>{t('Assigned Pilot')}</Text>

            <View style={styles.pilotRow}>
              <View style={styles.leftSection}>
                <Image
                  source={profileImage}
                  style={styles.profileImage}
                  resizeMode="contain"
                />
                <Text style={styles.pilotName}>{pilotName}</Text>
              </View>

              {/* New Message Icon Button */}
                <Pressable onPress={onMessagePress} style={styles.iconButton}>
                   <Image source={require('../assets/images/CallButton.png')} style={styles.iconStyle} />
                 </Pressable>
              
              <Pressable>
                <Image
                  source={callImage}
                  style={styles.callImage}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          </View>
        )}

      </CrossPlatformGradient>

      {/* Description Text OUTSIDE the blue card */}
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
    marginBottom: 12,
  },
  card: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 36, // Text ke liye space create kiya
  },

  // Drone aur Text ka container
  nodeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  circle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedCircle: {
    backgroundColor: '#FFFFFF',
  },
  currentCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  drone: {
    width: 22,
    height: 22,
  },

  // Floating text jo drone ke neeche aayega
  activeTitle: {
    position: 'absolute',
    top: 50, // Circle ke theek neeche
    width: 140, // Lamba text wrap na ho
    left: -48, // Circle ke center mein align karne ke liye
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 13, // 14 tha pehle, thoda neat dikhne ke liye 13 kiya
    fontWeight: '600',
  },

  line: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeLine: {
    backgroundColor: '#FFFFFF',
  },

  // Pilot Section Styles
  pilotSection: {
    marginTop: 0, // Space upar progressRow ne le liya hai
  },
  assignedText: {
    color: '#D1D5DB',
    fontSize: 12,
    marginBottom: 8,
  },
  pilotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
  },
  pilotName: {
    marginLeft: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  callImage: {
    width: 40,
    height: 40,
  },

  description: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
   iconButton: {
    marginLeft: 'auto', // Pushes it gracefully next to the call button
    marginRight: 12,
  },
  iconStyle: {
    width: 40,
    height: 40,
  },
});

export default BookingStatusCard;
