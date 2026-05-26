import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const fontSizeTokens = [
  "display-lg",
  "display-lg-mobile",
  "headline-lg",
  "headline-lg-mobile",
  "headline-md",
  "body-lg",
  "body-md",
  "label-md",
  "label-sm",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": fontSizeTokens.map((t) => `text-${t}`),
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
