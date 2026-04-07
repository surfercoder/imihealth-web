import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { HowSection } from "@/components/public-landing-page/how-section";

describe("HowSection", () => {
  it("renders all translated headings, options and disclaimers", () => {
    const t = (key: string) => `t:${key}`;
    render(<HowSection t={t} />);

    expect(screen.getByText("t:howTitle")).toBeInTheDocument();
    expect(screen.getByText("t:howSubtitle")).toBeInTheDocument();
    expect(screen.getByText("t:howMethod1Title")).toBeInTheDocument();
    expect(screen.getByText("t:howMethod1Desc")).toBeInTheDocument();
    expect(screen.getByText("t:howMethod2Title")).toBeInTheDocument();
    expect(screen.getByText("t:howMethod2Desc")).toBeInTheDocument();
    expect(screen.getByText("t:howEditable")).toBeInTheDocument();
    expect(screen.getByText("t:howDisclaimer")).toBeInTheDocument();
    expect(screen.getByText("t:howTagline")).toBeInTheDocument();
    expect(screen.getAllByText(/t:howOption/)).toHaveLength(2);
  });
});
