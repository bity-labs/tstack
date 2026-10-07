import { StatusBar } from "expo-status-bar";


import { WelcomeScreen } from "../components/WelcomeScreen";
import { useWelcomeMessage } from "../src/useWelcomeMessage";

export default function IndexScreen() {
  const message = useWelcomeMessage("boilerplate-mobile-application");

  return (
    <>
      <StatusBar style="dark" />
      <WelcomeScreen message={message} />
    </>
  );
}
