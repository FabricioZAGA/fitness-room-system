import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  StudentStatusBadge,
  MembershipStatusBadge,
  ReservationStatusBadge,
} from "@/components/shared/StatusBadge";

describe("StudentStatusBadge", () => {
  it("renders 'Activo' for active status", () => {
    render(<StudentStatusBadge status="active" />);
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("renders 'Nuevo' for new status", () => {
    render(<StudentStatusBadge status="new" />);
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it("renders 'Inactivo' for inactive status", () => {
    render(<StudentStatusBadge status="inactive" />);
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("renders 'Fundador' for founder status", () => {
    render(<StudentStatusBadge status="founder" />);
    expect(screen.getByText("Fundador")).toBeInTheDocument();
  });
});

describe("MembershipStatusBadge", () => {
  it("renders 'Activa' for active status", () => {
    render(<MembershipStatusBadge status="active" />);
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it("renders 'Vencida' for expired status", () => {
    render(<MembershipStatusBadge status="expired" />);
    expect(screen.getByText("Vencida")).toBeInTheDocument();
  });

  it("renders 'Cancelada' for cancelled status", () => {
    render(<MembershipStatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("renders 'Pendiente' for pending status", () => {
    render(<MembershipStatusBadge status="pending" />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });
});

describe("ReservationStatusBadge", () => {
  it("renders 'Confirmada' for confirmed status", () => {
    render(<ReservationStatusBadge status="confirmed" />);
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
  });

  it("renders 'Lista de espera' for waitlisted status", () => {
    render(<ReservationStatusBadge status="waitlisted" />);
    expect(screen.getByText("Lista de espera")).toBeInTheDocument();
  });

  it("renders 'Asistió' for attended status", () => {
    render(<ReservationStatusBadge status="attended" />);
    expect(screen.getByText("Asistió")).toBeInTheDocument();
  });

  it("renders 'No asistió' for no_show status", () => {
    render(<ReservationStatusBadge status="no_show" />);
    expect(screen.getByText("No asistió")).toBeInTheDocument();
  });
});
