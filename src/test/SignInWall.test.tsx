import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SignInWall } from "@/components/SignInWall";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

let mockAuth: { user: { id: string } | null } = { user: null };

describe("SignInWall", () => {
  it("renders the sign-up prompt when not authenticated", () => {
    mockAuth = { user: null };
    render(
      <MemoryRouter>
        <SignInWall action="request a quote">
          <button>Hidden CTA</button>
        </SignInWall>
      </MemoryRouter>,
    );
    expect(screen.getByText(/sign up or log in to request a quote/i)).toBeInTheDocument();
    expect(screen.queryByText("Hidden CTA")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockAuth = { user: { id: "u1" } };
    render(
      <MemoryRouter>
        <SignInWall action="anything">
          <button>Now visible</button>
        </SignInWall>
      </MemoryRouter>,
    );
    expect(screen.getByText("Now visible")).toBeInTheDocument();
    expect(screen.queryByText(/sign up or log in/i)).not.toBeInTheDocument();
  });

  it("preserves redirect URL in the auth links", () => {
    mockAuth = { user: null };
    render(
      <MemoryRouter>
        <SignInWall action="download" redirectTo="/resources">
          <span>x</span>
        </SignInWall>
      </MemoryRouter>,
    );
    const signup = screen.getByRole("link", { name: /sign up/i });
    expect(signup.getAttribute("href")).toContain("redirect=%2Fresources");
  });
});
