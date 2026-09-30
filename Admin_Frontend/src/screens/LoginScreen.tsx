import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, useWindowDimensions, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

// Handles asset importing correctly for both Web and Mobile bundlers
const loginImgSource = require('../assets/images/LoginScreenImage.png');

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { width } = useWindowDimensions();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      await login(email.trim(), password, rememberMe);
      // Navigation is handled automatically by AppNavigator when authentication state changes
    } catch (err: any) {
      console.error('❌ Login error:', err);
      
      // Map error messages to user-friendly text
      let displayMessage = err?.message || 'Login failed. Please try again.';
      
      // Handle specific error scenarios
      if (err?.statusCode === 0 || err?.error === 'NETWORK_ERROR') {
        displayMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (err?.statusCode === 401) {
        // Keep backend message for 401 (wrong credentials)
        displayMessage = err.message;
      } else if (err?.statusCode === 403) {
        // Keep backend message for 403 (account issues)
        displayMessage = err.message;
      } else if (err?.statusCode === 429) {
        displayMessage = 'Too many login attempts. Please wait a few minutes and try again.';
      } else if (err?.statusCode === 503 || err?.statusCode === 502) {
        displayMessage = 'Service temporarily unavailable. Please try again in a few moments.';
      } else if (err?.statusCode === 504 || err?.statusCode === 408) {
        displayMessage = 'Request timed out. Please check your connection and try again.';
      } else if (err?.statusCode >= 500) {
        displayMessage = 'Server error. Please try again later or contact support.';
      }
      
      setErrorMsg(displayMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsSendingReset(true);

    try {
      // TODO: Implement forgot password API call
      // await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Success',
        'Password reset instructions have been sent to your email address.',
        [
          {
            text: 'OK',
            onPress: () => {
              setForgotModalVisible(false);
              setForgotEmail('');
            }
          }
        ]
      );
    } catch (err: any) {
      console.error('❌ Forgot password error:', err);
      Alert.alert(
        'Error',
        err?.message || 'Failed to send reset email. Please try again.'
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* LEFT FORM SIDE */}
      <View style={styles.leftPane}>
        <View style={styles.formWidth}>
          <Text style={styles.logo}>⌘ Hawk Aerosystem</Text>
          <Text style={styles.title}>Log in</Text>
          <Text style={styles.subtitle}>Welcome back! Please enter your details.</Text>

          <Text style={styles.label}>Enter your email</Text>
          <TextInput 
            style={styles.input} 
            value={email} 
            onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
            placeholder="admin@hawk.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />

          <Text style={styles.label}>Enter your password</Text>
          <TextInput 
            style={styles.input} 
            secureTextEntry 
            value={password} 
            onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            editable={!isLoading}
            onSubmitEditing={handleLogin}
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <View style={styles.row}>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checked]} />
              <Text style={styles.rowText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForgotModalVisible(true)}>
              <Text style={styles.forgotPass}>Forgot password</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading 
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.buttonText}>Login</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* RIGHT TELEMETRY PANELS */}
      {/* Fixed: Replaced '&&' with a ternary operator to prevent rendering 'false' on mobile screens */}
      {width > 800 ? (
        <View style={styles.rightPane}>
          <Image 
            //source={loginImgSource?.default ? loginImgSource.default : loginImgSource} 
            source={typeof loginImgSource === 'number' ? loginImgSource : (loginImgSource?.default || loginImgSource)}
            style={styles.rightPaneImage} 
            resizeMode="stretch" 
          />
        </View>
      ) : null}

      {/* ==================== FORGOT PASSWORD POPUP WINDOW (MODAL) ==================== */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Forgot Password?</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address below and we'll send you instructions to reset your password.
            </Text>

            <Text style={styles.modalLabel}>Email Address</Text>
            <TextInput
              style={styles.modalInput}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              placeholder="superadmin@hawkaero.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSendingReset}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => { 
                  setForgotModalVisible(false); 
                  setForgotEmail(''); 
                }}
                disabled={isSendingReset}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalSubmitButton, isSendingReset && styles.buttonDisabled]} 
                onPress={handleForgotPasswordSubmit}
                disabled={isSendingReset}
              >
                {isSendingReset ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#F9FAFB' },
  leftPane: { flex: 1, justifyContent: 'center', paddingHorizontal: 60, backgroundColor: '#FFF' },
  rightPane: { 
    flex: 1.2, 
    backgroundColor: '#343CD2', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  formWidth: { width: '100%', maxWidth: 380 },
  logo: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginTop: 16, marginBottom: 6 },
  input: { borderBottomWidth: 1, borderColor: '#D1D5DB', paddingVertical: 6, fontSize: 14, color: '#111827' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 28 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 16, height: 16, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, marginRight: 8 },
  checked: { backgroundColor: '#4338CA', borderColor: '#4338CA' },
  rowText: { fontSize: 13, color: '#4B5563' },
  forgotPass: { fontSize: 13, color: '#4338CA', fontWeight: '500' },
  button: { backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 13, marginTop: 8 },
  cardOverlay: { backgroundColor: 'rgba(255,255,255,0.12)', padding: 24, borderRadius: 16, width: 280 },
  droneId: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  statLine: { color: '#E0E7FF', fontSize: 14, marginVertical: 4 },
  rightPaneImage: {
    width: '100%',
    height: '100%',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 24,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  modalCancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSubmitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
});