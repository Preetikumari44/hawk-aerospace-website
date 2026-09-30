import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';
import App from './App';
import appConfig from './app.json';

// 2. DISABLE native screens specifically for the web package pipeline
enableScreens(false);
// Register the core app component
AppRegistry.registerComponent(appConfig.name, () => App);

// Mount the output directly into the browser DOM
AppRegistry.runApplication(appConfig.name, {
  initialProps: {},
  rootTag: document.getElementById('app-root'),
});