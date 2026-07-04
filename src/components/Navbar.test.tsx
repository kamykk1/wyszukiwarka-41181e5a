import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";

// Zamockuj konteksty i zależności, których Navbar potrzebuje w teście
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

vi.mock("@/components/UserLevelBadge", () => ({
  default: () => null,
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>
  );

describe("Navbar tagline", () => {
  it("renderuje 'Najlepsze oferty z wynagrodzeniem' na stronie głównej", () => {
    renderAt("/");
    expect(
      screen.getByText("Najlepsze oferty z wynagrodzeniem")
    ).toBeInTheDocument();
  });

  it("renderuje tagline również po przejściu na inne widoki", () => {
    for (const route of ["/cashback", "/konta", "/kredyty", "/lokaty", "/login"]) {
      const { unmount } = renderAt(route);
      expect(
        screen.getByText("Najlepsze oferty z wynagrodzeniem")
      ).toBeInTheDocument();
      unmount();
    }
  });

  it("nie renderuje przestarzałej wersji taglinu", () => {
    renderAt("/");
    expect(
      screen.queryByText(/otrzymuj punkty za codzienne czynności/i)
    ).not.toBeInTheDocument();
  });
});
