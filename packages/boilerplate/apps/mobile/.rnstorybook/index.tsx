import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { view } from './storybook.requires';

const StorybookUI = view.getStorybookUI({
  storage: AsyncStorage,
});

export default function Storybook() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StorybookUI />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
