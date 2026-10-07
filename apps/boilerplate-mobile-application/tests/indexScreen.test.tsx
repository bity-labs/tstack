import { render, screen } from "@testing-library/react-native";

import IndexScreen from "../app/index";

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null
}));

describe("IndexScreen route", () => {
  it("renders the Effect-computed welcome message through useWelcomeMessage", async () => {
    await render(<IndexScreen />);

    expect(screen.getByText("Welcome to boilerplate-mobile-application")).toBeOnTheScreen();
  });
});
