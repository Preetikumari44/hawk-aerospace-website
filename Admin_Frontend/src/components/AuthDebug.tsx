/**
 * AuthDebug Component
 * 
 * Add this to any screen to debug authentication status
 * Usage: import { AuthDebug } from '../components/AuthDebug';
 *        <AuthDebug />
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getToken, getRefreshToken } from '../context/AuthContext';

export function AuthDebug() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showTokens, setShowTokens] = React.useState(false);
  
  const token = getToken();
  const refreshToken = getRefreshToken();
  
  // Decode JWT to show payload
  let tokenPayload: any = null;
  if (token) {
    try {
      tokenPayload = JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Auth Debug</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Loading:</Text>
        <Text style={[styles.value, isLoading ? styles.warning : styles.success]}>
          {isLoading ? 'Yes' : 'No'}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Authenticated:</Text>
        <Text style={[styles.value, isAuthenticated ? styles.success : styles.error]}>
          {isAuthenticated ? 'Yes' : 'No'}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>User:</Text>
        <Text style={styles.value}>{user?.email || 'None'}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Role:</Text>
        <Text style={[styles.value, styles.bold]}>{user?.role || 'None'}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Has Token:</Text>
        <Text style={[styles.value, token ? styles.success : styles.error]}>
          {token ? 'Yes' : 'No'}
        </Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Has Refresh:</Text>
        <Text style={[styles.value, refreshToken ? styles.success : styles.error]}>
          {refreshToken ? 'Yes' : 'No'}
        </Text>
      </View>
      
      {tokenPayload && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Token UID:</Text>
            <Text style={styles.value}>{tokenPayload.uid || 'N/A'}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Token Role:</Text>
            <Text style={[styles.value, styles.bold]}>{tokenPayload.role || 'N/A'}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Token Expires:</Text>
            <Text style={styles.value}>
              {tokenPayload.exp ? new Date(tokenPayload.exp * 1000).toLocaleString() : 'N/A'}
            </Text>
          </View>
        </>
      )}
      
      <TouchableOpacity 
        style={styles.toggleButton} 
        onPress={() => setShowTokens(!showTokens)}
      >
        <Text style={styles.toggleButtonText}>
          {showTokens ? 'Hide Tokens' : 'Show Tokens'}
        </Text>
      </TouchableOpacity>
      
      {showTokens && (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Access Token:</Text>
          <Text style={styles.tokenText} selectable>
            {token || 'No token'}
          </Text>
          
          <Text style={styles.tokenLabel}>Refresh Token:</Text>
          <Text style={styles.tokenText} selectable>
            {refreshToken || 'No refresh token'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    width: 120,
  },
  value: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  success: {
    color: '#10B981',
    fontWeight: '600',
  },
  error: {
    color: '#EF4444',
    fontWeight: '600',
  },
  warning: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: '#535CE8',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tokenContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    marginTop: 8,
  },
  tokenText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#111827',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 4,
    maxHeight: 100,
  },
});
