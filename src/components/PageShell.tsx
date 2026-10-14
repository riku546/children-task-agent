import type { ReactNode } from "react";

type Width = "default" | "wide" | "narrow";

const widthClass: Record<Width, string> = {
  default: "max-w-5xl",
  wide: "max-w-6xl",
  narrow: "max-w-3xl"
};

type Props = {
  children: ReactNode;
  width?: Width;
  className?: string;
};

export function PageShell({ children, width = "default", className = "" }: Props) {
  return (
    <section
      className={`mx-auto ${widthClass[width]} px-4 pb-20 pt-6 sm:px-6 md:pb-12 md:pt-8 ${className}`}
    >
      {children}
    </section>
  );
}
