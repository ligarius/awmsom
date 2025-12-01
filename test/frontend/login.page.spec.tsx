/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuthContext } from "@/providers/AuthProvider";
import { toast } from "@/components/ui/use-toast";

jest.mock("@/providers/AuthProvider");
jest.mock("@/components/ui/use-toast", () => ({ toast: jest.fn() }));

const mockedUseAuthContext = useAuthContext as jest.Mock;
const LoginPage = require("../../frontend/src/app/login/page").default;

describe("LoginPage OAuth button", () => {
  beforeEach(() => {
    mockedUseAuthContext.mockReturnValue({
      login: jest.fn(),
      submitMfaCode: jest.fn(),
      mfaChallenge: null,
      mfaRequired: false,
      mfaCode: "",
      setMfaCode: jest.fn(),
      startOAuth: jest.fn().mockResolvedValue("https://provider.example.com/authorize"),
    });

    Object.defineProperty(window, "location", {
      value: { assign: jest.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("redirects to provider when startOAuth returns a URL", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Tenant"), { target: { value: "tenant-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar con OAuth2" }));

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith("https://provider.example.com/authorize");
    });
  });

  it("shows an error toast when the OAuth start fails", async () => {
    const startOAuthMock = jest.fn().mockRejectedValue(new Error("Provider unavailable"));

    mockedUseAuthContext.mockImplementation(() => ({
      login: jest.fn(),
      submitMfaCode: jest.fn(),
      mfaChallenge: null,
      mfaRequired: false,
      mfaCode: "",
      setMfaCode: jest.fn(),
      startOAuth: startOAuthMock,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Tenant"), { target: { value: "tenant-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar con OAuth2" }));

    await waitFor(() => {
      expect(startOAuthMock).toHaveBeenCalledWith({ provider: "oidc-demo", tenantId: "tenant-1" });
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Provider unavailable", title: "No pudimos iniciar sesión con OAuth" })
      );
    });
  });
});
