import type { Preview } from "@storybook/nextjs-vite";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import React from "react";
import "../src/app/globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "surface",
      values: [
        { name: "surface", value: "#f8f9fa" },
        { name: "white", value: "#ffffff" },
        { name: "container", value: "#edeeef" },
        { name: "inverse", value: "#2e3132" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          "Foundations",
          ["Introduction", "Colors", "Typography", "Spacing & Radii"],
          "UI",
          "Booking",
          "Layout",
          "Pages",
        ],
      },
    },
    a11y: { test: "todo" },
  },
  decorators: [
    (Story) => (
      <div
        className={`${ibmPlexSansThai.variable} font-sans text-on-background`}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
