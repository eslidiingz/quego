import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React from "react";

const sampleTH = "ยกระดับการรอคอยของคุณ";
const sampleEN = "Concierge Quality Waiting.";

const ramp: { name: string; className: string; family: string; note: string }[] = [
  { name: "display-lg", className: "text-display-lg font-display font-bold", family: "IBM Plex Sans Thai 700", note: "48 / 56 · -0.02em" },
  { name: "display-lg-mobile", className: "text-display-lg-mobile font-display font-bold", family: "IBM Plex Sans Thai 700", note: "32 / 40 · -0.01em" },
  { name: "headline-lg", className: "text-headline-lg font-display font-semibold", family: "IBM Plex Sans Thai 600", note: "32 / 40" },
  { name: "headline-lg-mobile", className: "text-headline-lg-mobile font-display font-semibold", family: "IBM Plex Sans Thai 600", note: "24 / 32" },
  { name: "headline-md", className: "text-headline-md font-display font-semibold", family: "IBM Plex Sans Thai 600", note: "24 / 32" },
  { name: "body-lg", className: "text-body-lg font-sans", family: "IBM Plex Sans Thai 400", note: "18 / 28" },
  { name: "body-md", className: "text-body-md font-sans", family: "IBM Plex Sans Thai 400", note: "16 / 24" },
  { name: "label-md", className: "text-label-md font-sans font-medium", family: "IBM Plex Sans Thai 500", note: "14 / 20 · +0.01em" },
  { name: "label-sm", className: "text-label-sm font-sans font-semibold uppercase", family: "IBM Plex Sans Thai 600", note: "12 / 16 · +0.05em · uppercase" },
];

function TypographyShowcase() {
  return (
    <div className="p-8 max-w-5xl space-y-8 bg-background">
      <header>
        <h1 className="font-display text-headline-lg text-primary">Typography</h1>
        <p className="text-on-surface-variant text-body-md mt-2 max-w-2xl">
          Single family <b>IBM Plex Sans Thai</b> drives the entire ramp — display through
          label — with weight variations carrying the hierarchy. Thai and Latin glyphs come
          from the same family, eliminating mixed-script vertical-alignment drift.
          Apply with Tailwind utilities like
          <code className="ml-1">text-headline-lg font-display</code>.
        </p>
      </header>
      <div className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
        {ramp.map((r) => (
          <div key={r.name} className="p-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-baseline">
            <div>
              <code className="text-label-sm text-primary">{r.name}</code>
              <p className="text-xs text-on-surface-variant mt-1">{r.family}</p>
              <p className="text-xs text-on-surface-variant">{r.note}</p>
            </div>
            <div>
              <p className={`${r.className} text-on-surface`}>{sampleTH}</p>
              <p className={`${r.className} text-on-surface-variant`}>{sampleEN}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof TypographyShowcase> = {
  title: "Foundations/Typography",
  component: TypographyShowcase,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof TypographyShowcase>;
export const TypeRamp: Story = {};
