/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import type React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "@/components/ui/use-toast";

const mockGet = jest.fn();
const mockPatch = jest.fn();

jest.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>
}));

jest.mock("@/components/settings/SettingsHeader", () => ({
  SettingsHeader: ({ title }: { title: string }) => <h1>{title}</h1>
}));

jest.mock("@/hooks/useApi", () => ({
  useApi: () => ({ get: mockGet, patch: mockPatch, post: jest.fn() })
}));

jest.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ canManageCompliance: true })
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuthContext: () => ({
    user: { fullName: "Tester" },
    logout: jest.fn(),
    initializing: false,
    isAuthenticated: true,
    mfaRequired: false,
    mfaChallenge: null,
    mfaCode: "",
    login: jest.fn(),
    submitMfaCode: jest.fn(),
    setMfaCode: jest.fn(),
    getUser: jest.fn(),
    startOAuth: jest.fn()
  })
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/settings/compliance",
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock("@/components/ui/use-toast", () => ({ toast: jest.fn() }));

const CompliancePage = require("../../frontend/src/app/settings/compliance/page").default;

describe("Compliance settings page", () => {
  beforeEach(() => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/compliance/settings") {
        return Promise.resolve({ retentionDays: 90 });
      }
      if (url === "/audit/reviews/settings") {
        return Promise.resolve({ frequency: "quarterly", nextReviewDate: "2025-03-10", notifyDaysBefore: 10 });
      }
      return Promise.resolve({});
    });
    mockPatch.mockResolvedValue({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("muestra mensajes de validación cuando faltan datos obligatorios", async () => {
    render(<CompliancePage />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

    fireEvent.change(screen.getByLabelText("Días de retención"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar retención" }));

    expect(await screen.findByText(/Define un número válido de días/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Próxima revisión"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Programar revisión" }));

    expect(await screen.findByText(/Define una fecha objetivo/)).toBeInTheDocument();
  });

  it("confirma los guardados exitosos de configuración y auditoría", async () => {
    render(<CompliancePage />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));

    fireEvent.change(screen.getByLabelText("Días de retención"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar retención" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith("/compliance/settings", { retentionDays: 120 });
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Retención actualizada" })
      );
    });

    fireEvent.change(screen.getByLabelText("Próxima revisión"), { target: { value: "2025-06-01" } });
    fireEvent.change(screen.getByLabelText("Avisar con (días)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Frecuencia"), { target: { value: "monthly" } });
    fireEvent.click(screen.getByRole("button", { name: "Programar revisión" }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith("/audit/reviews/settings", {
        frequency: "monthly",
        nextReviewDate: "2025-06-01",
        notifyDaysBefore: 5
      });
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Revisión programada" })
      );
    });
  });
});
