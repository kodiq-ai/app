import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GoToLineDialog } from "../GoToLineDialog";

vi.mock("@/lib/i18n", () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      goToLineTitle: "Go to Line",
      goToLinePlaceholder: "Go to Line (1 – {max})",
    };
    return map[key] ?? key;
  },
}));

describe("GoToLineDialog", () => {
  const onJump = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <GoToLineDialog open={false} totalLines={100} onJump={onJump} onClose={onClose} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders input when open", () => {
    render(<GoToLineDialog open={true} totalLines={100} onJump={onJump} onClose={onClose} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("calls onJump with valid line number on Enter", () => {
    render(<GoToLineDialog open={true} totalLines={100} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onJump).toHaveBeenCalledWith(42);
    expect(onClose).toHaveBeenCalled();
  });

  it("clamps line number to valid range", () => {
    render(<GoToLineDialog open={true} totalLines={50} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onJump).toHaveBeenCalledWith(50);
  });

  it("clamps to 1 when value is below 1", () => {
    render(<GoToLineDialog open={true} totalLines={50} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onJump).toHaveBeenCalledWith(1);
  });

  it("ignores non-numeric input", () => {
    render(<GoToLineDialog open={true} totalLines={50} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onJump).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape", () => {
    render(<GoToLineDialog open={true} totalLines={50} onJump={onJump} onClose={onClose} />);
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(onJump).not.toHaveBeenCalled();
  });
});
