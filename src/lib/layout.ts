import type { CSSProperties } from "react"

export const APP_NAV_HEIGHT = "3.5rem"

export const APP_SHELL_STYLE = {
  "--app-nav-height": APP_NAV_HEIGHT,
} as CSSProperties

export const APP_CONTENT_CLASS =
  "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8"

export const APP_NAV_HEIGHT_CLASS = "h-[var(--app-nav-height)]"

export const PAGE_MIN_HEIGHT_CLASS =
  "min-h-[calc(100dvh-var(--app-nav-height))]"

export const APP_PAGE_CLASS = `${PAGE_MIN_HEIGHT_CLASS} py-8`
