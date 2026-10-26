import { render, screen } from "@testing-library/react-native";

import { WelcomeScreen } from "../components/WelcomeScreen";

describe("WelcomeScreen component", () => {
  it("renders the welcome message", async () => {
    await render(<WelcomeScreen message="Welcome to boilerplate-mobile-application" />);

    expect(screen.getByText("Welcome to boilerplate-mobile-application")).toBeOnTheScreen();
    expect(screen.getByText("Get started")).toBeOnTheScreen();
  });
});
