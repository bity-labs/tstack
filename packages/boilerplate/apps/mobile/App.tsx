import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthScreen } from './src/features/authentication';
import { getApiUrl } from './src/lib/api-config';

export default function App() {
  let configurationError: string | undefined;
  try {
    getApiUrl();
  } catch (cause) {
    configurationError =
      cause instanceof Error ? cause.message : 'Invalid API configuration.';
  }
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f8fb' }}>
        <StatusBar style="dark" />
        {configurationError ? (
          <Text accessibilityRole="alert" style={{ padding: 28 }}>
            {configurationError}
          </Text>
        ) : (
          <AuthScreen />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
