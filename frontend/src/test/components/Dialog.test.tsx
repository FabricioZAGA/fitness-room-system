import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dialog } from "@/components/shared/Dialog";

describe("Dialog", () => {
  it("renders nothing when open=false", () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="Test">
        <p>content</p>
      </Dialog>
    );
    expect(screen.queryByText("Test")).not.toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("renders title and children when open=true", () => {
    render(
      <Dialog open={true} onClose={vi.fn()} title="Nueva Clase">
        <p>form content</p>
      </Dialog>
    );
    expect(screen.getByText("Nueva Clase")).toBeInTheDocument();
    expect(screen.getByText("form content")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <Dialog open={true} onClose={vi.fn()} title="T" description="Descripción del modal">
        <span />
      </Dialog>
    );
    expect(screen.getByText("Descripción del modal")).toBeInTheDocument();
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose} title="T">
        <span />
      </Dialog>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose} title="T">
        <span />
      </Dialog>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog open={true} onClose={onClose} title="T">
        <span />
      </Dialog>
    );
    const backdrop = container.firstElementChild;
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
