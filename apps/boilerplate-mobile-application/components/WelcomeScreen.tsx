import { Pressable, StyleSheet, Text, View } from "react-native";

export type WelcomeScreenProps = {
  readonly message: string;
};

export function WelcomeScreen({ message }: WelcomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{message}</Text>
      <Pressable style={styles.button}>
        <Text style={styles.buttonText}>Get started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
