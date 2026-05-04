import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

globalThis.PointerEvent ??= MouseEvent as typeof PointerEvent

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans", className: "geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono", className: "geist-mono" }),
}))

vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => null,
}))
