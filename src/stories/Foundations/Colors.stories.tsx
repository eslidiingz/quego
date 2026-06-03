import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import React from "react";

const tonalGroups: { title: string; tokens: { name: string; bg: string; text: string }[] }[] = [
  {
    title: "Primary — Deep Teal",
    tokens: [
      { name: "primary", bg: "bg-primary", text: "text-on-primary" },
      { name: "on-primary", bg: "bg-on-primary border border-outline-variant", text: "text-on-background" },
      { name: "primary-container", bg: "bg-primary-container", text: "text-on-primary-container" },
      { name: "on-primary-container", bg: "bg-on-primary-container", text: "text-primary-container" },
      { name: "primary-fixed", bg: "bg-primary-fixed", text: "text-on-primary-fixed" },
      { name: "primary-fixed-dim", bg: "bg-primary-fixed-dim", text: "text-on-primary-fixed" },
      { name: "inverse-primary", bg: "bg-inverse-primary", text: "text-on-primary-fixed" },
    ],
  },
  {
    title: "Secondary — Metallic Gold",
    tokens: [
      { name: "secondary", bg: "bg-secondary", text: "text-on-secondary" },
      { name: "on-secondary", bg: "bg-on-secondary border border-outline-variant", text: "text-on-background" },
      { name: "secondary-container", bg: "bg-secondary-container", text: "text-on-secondary-container" },
      { name: "on-secondary-container", bg: "bg-on-secondary-container", text: "text-secondary-container" },
      { name: "secondary-fixed", bg: "bg-secondary-fixed", text: "text-on-secondary-fixed" },
      { name: "secondary-fixed-dim", bg: "bg-secondary-fixed-dim", text: "text-on-secondary-fixed" },
    ],
  },
  {
    title: "Tertiary — Deep Purple",
    tokens: [
      { name: "tertiary", bg: "bg-tertiary", text: "text-on-tertiary" },
      { name: "tertiary-container", bg: "bg-tertiary-container", text: "text-on-tertiary-container" },
      { name: "tertiary-fixed", bg: "bg-tertiary-fixed", text: "text-on-tertiary-fixed" },
      { name: "tertiary-fixed-dim", bg: "bg-tertiary-fixed-dim", text: "text-on-tertiary-fixed" },
    ],
  },
  {
    title: "Surfaces",
    tokens: [
      { name: "background", bg: "bg-background border border-outline-variant", text: "text-on-background" },
      { name: "surface", bg: "bg-surface border border-outline-variant", text: "text-on-surface" },
      { name: "surface-container-lowest", bg: "bg-surface-container-lowest border border-outline-variant", text: "text-on-surface" },
      { name: "surface-container-low", bg: "bg-surface-container-low", text: "text-on-surface" },
      { name: "surface-container", bg: "bg-surface-container", text: "text-on-surface" },
      { name: "surface-container-high", bg: "bg-surface-container-high", text: "text-on-surface" },
      { name: "surface-container-highest", bg: "bg-surface-container-highest", text: "text-on-surface" },
      { name: "surface-dim", bg: "bg-surface-dim", text: "text-on-surface" },
      { name: "inverse-surface", bg: "bg-inverse-surface", text: "text-inverse-on-surface" },
    ],
  },
  {
    title: "Text & Outline",
    tokens: [
      { name: "on-background", bg: "bg-on-background", text: "text-background" },
      { name: "on-surface", bg: "bg-on-surface", text: "text-surface" },
      { name: "on-surface-variant", bg: "bg-on-surface-variant", text: "text-surface" },
      { name: "outline", bg: "bg-outline", text: "text-surface" },
      { name: "outline-variant", bg: "bg-outline-variant", text: "text-on-background" },
    ],
  },
  {
    title: "Status",
    tokens: [
      { name: "success", bg: "bg-success", text: "text-on-success" },
      { name: "success-container", bg: "bg-success-container", text: "text-on-success-container" },
      { name: "error", bg: "bg-error", text: "text-on-error" },
      { name: "error-container", bg: "bg-error-container", text: "text-on-error-container" },
    ],
  },
];

function Swatch({ name, bg, text }: { name: string; bg: string; text: string }) {
  return (
    <div className={`rounded-lg p-4 h-24 flex flex-col justify-between ${bg} ${text}`}>
      <span className="text-label-sm uppercase tracking-wider">{name}</span>
      <code className="text-xs opacity-80">--color-{name}</code>
    </div>
  );
}

function ColorsShowcase() {
  return (
    <div className="p-8 max-w-6xl space-y-10 bg-background">
      <header>
        <h1 className="font-display text-headline-lg text-primary">Color Tokens</h1>
        <p className="text-on-surface-variant mt-2 text-body-md">
          Material 3 tonal roles backing the LuxeQueue palette. All tokens are
          available as Tailwind utilities: <code>bg-primary</code>, <code>text-secondary</code>, etc.
        </p>
      </header>
      {tonalGroups.map((g) => (
        <section key={g.title}>
          <h2 className="font-display text-headline-md text-on-surface mb-4">{g.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {g.tokens.map((t) => (
              <Swatch key={t.name} {...t} />
            ))}
          </div>
        </section>
      ))}
      <section>
        <h2 className="font-display text-headline-md text-on-surface mb-4">Brand Gradients</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 rounded-lg bg-luxury-gradient text-on-primary flex items-end p-4 text-label-sm">
            .bg-luxury-gradient
          </div>
          <div className="h-24 rounded-lg bg-progress-gradient text-on-primary flex items-end p-4 text-label-sm">
            .bg-progress-gradient
          </div>
          <div className="h-24 rounded-lg bg-teal-purple-gradient text-on-primary flex items-end p-4 text-label-sm">
            .bg-teal-purple-gradient
          </div>
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof ColorsShowcase> = {
  title: "Foundations/Colors",
  component: ColorsShowcase,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof ColorsShowcase>;

export const Palette: Story = {};
