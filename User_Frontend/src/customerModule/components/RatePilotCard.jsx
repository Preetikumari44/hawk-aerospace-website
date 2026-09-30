import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { useLanguage } from '../../i18n';
import { customerApi } from '../../utils/api';

const RatePilotCard = ({ bookingId, booking, pilotName = 'Pilot', onRated }) => {
  const { t } = useLanguage();
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const alreadyRated = booking?.customerRating != null && booking?.customerRating > 0;
  const displayedRating = alreadyRated ? Number(booking.customerRating) : selectedRating;

  // react-native-web's Alert.alert is a no-op, so show messages via window.alert on web.
  const notify = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(message || title);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRating) {
      notify(t('Rating Required'), t('Please select a star rating before submitting.'));
      return;
    }
    if (!bookingId) {
      notify(t('Rating Failed'), t('Booking information is missing.'));
      return;
    }
    setSubmitting(true);
    try {
      await customerApi.rateBooking(bookingId, selectedRating, feedback);
      notify(t('Thank You'), t('Your rating has been submitted successfully.'));
      if (typeof onRated === 'function') {
        onRated();
      }
    } catch (error) {
      notify(t('Rating Failed'), error?.message || t('Could not submit your rating. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {alreadyRated ? t('Your Rating') : t('Rate your Pilot')}
      </Text>
      <Text style={styles.description}>
        {alreadyRated
          ? t('You rated this pilot {{stars}}/5', { stars: displayedRating })
          : t('Pilot ratings help us monitor our services, so that we provide you the best service in every booking')}
      </Text>

      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((item) => (
          <Pressable
            key={item}
            disabled={alreadyRated || submitting}
            onPress={() => setSelectedRating(item)}
            hitSlop={6}
          >
            <MaterialIcons
              name={item <= displayedRating ? 'star' : 'star-border'}
              size={40}
              color="#FDC700"
            />
          </Pressable>
        ))}
      </View>

      {!alreadyRated && (
        <>
          <TextInput
            style={styles.feedbackInput}
            placeholder={t('Share your feedback (optional)')}
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={feedback}
            onChangeText={setFeedback}
          />
          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            disabled={submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>{t('Submit Rating')}</Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
    alignSelf: 'flex-start',
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 20,
  },
  feedbackInput: {
    width: '100%',
    minHeight: 84,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#374151',
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#5060D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default RatePilotCard;
