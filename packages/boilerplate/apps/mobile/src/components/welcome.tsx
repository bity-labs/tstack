import { StyleSheet, Text, View } from 'react-native';

export interface WelcomeProps {
  title?: string;
  description?: string;
}

export function Welcome({
  title = 'Welcome to TStack',
  description = 'Your mobile workspace is ready. Build something useful.',
}: WelcomeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>TSTACK / MOBILE</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#f6f8fb',
    gap: 16,
  },
  eyebrow: {
    color: '#3857a6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: {
    color: '#182237',
    fontSize: 36,
    fontWeight: '700',
  },
  description: {
    color: '#526078',
    fontSize: 18,
    lineHeight: 28,
  },
});
