import 'react-native-gesture-handler'; // MUST BE AT THE VERY TOP
import React from 'react';
import { StyleSheet, StatusBar, View } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <SocketProvider>
        <View style={styles.rootContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <AppNavigator />
        </View>
      </SocketProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    height: '100vh'as any,
    width: '100vw'as any,
    backgroundColor: '#FFFFFF',
  },
});

export default App;