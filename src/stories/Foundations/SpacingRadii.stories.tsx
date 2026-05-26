import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React from "react";

const spacingTokens: { name: string; px: string; className: string }[] = [
  { name: "base", px: "8px", className: "p-base" },
  { name: "stack-sm", px: "12px", className: "p-stack-sm" },
  { name: "stack-md", px: "24px", className: "p-stack-md" },
  { name: "stack-lg", px: "40px", className: "p-stack-lg" },
  { name: "gutter", px: "24px", className: "p-gutter" },
  { name: "margin-mobile", px: "16px", className: "p-margin-mobile" },
  { name: "margin-desktop", px: "48px", className: "p-margin-desktop" },
];

const radiiTokens: { name: string; size: string; className: string }[] = [
  { name: "sm", size: "0.25rem", className: "rounded-sm" },
  { name: "md", size: "0.5rem", className: "rounded-md" },
  { name: "lg", size: "1rem", className: "rounded-lg" },
  { name: "xl", size: "1.5rem", className: "rounded-xl" },
  { name: "full", size: "9999px", className: "rounded-full" },
];

function SpacingRadii() {
  return (
    <div className="p-8 max-w-5xl space-y-12 bg-background">
      <section>
        <h1 className="font-display text-headline-lg text-primary mb-2">Spacing</h1>
        <p className="text-on-surface-variant mb-6 text-body-md">
          Spacing scale used for stacks and gutters across the system.
        </p>
        <div className="space-y-3">
          {spacingTokens.map((t) => (
            <div key={t.name} className="flex items-center gap-6">
              <code className="w-40 text-label-sm text-primary">{t.name}</code>
              <code className="w-16 text-xs text-on-surface-variant">{t.px}</code>
              <div className="flex-1 bg-surface-container-low rounded-lg">
                <div
                  className="bg-progress-gradient h-3 rounded-l-lg"
                  style={{ width: t.px }}
                />
              </div>
              <code className="text-xs text-on-surface-variant">{t.className}</code>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h1 className="font-display text-headline-lg text-primary mb-2">Radii</h1>
        <p className="text-on-surface-variant mb-6 text-body-md">
          Rounded-Level 2 shape language. Pills (full) for status chips; xl/lg for cards.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {radiiTokens.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className={`w-24 h-24 bg-primary-container ${r.className}`}
                style={{ borderRadius: r.name === "full" ? "9999px" : undefined }}
              />
              <code className="text-label-sm text-primary">rounded-{r.name}</code>
              <span className="text-xs text-on-surface-variant">{r.size}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof SpacingRadii> = {
  title: "Foundations/Spacing & Radii",
  component: SpacingRadii,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof SpacingRadii>;
export const Tokens: Story = {};
