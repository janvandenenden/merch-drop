import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { merge } from "lodash"
import { z } from "zod"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Geist } from "next/font/google"

describe("stack integration", () => {
  it("lodash works", () => {
    expect(merge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it("zod works", () => {
    expect(z.string().parse("hello")).toBe("hello")
  })

  it("date-fns works", () => {
    expect(format(new Date("2026-01-01"), "yyyy")).toBe("2026")
  })

  it("shadcn Button renders", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument()
  })

  it("TanStack Query resolves data", async () => {
    const queryClient = new QueryClient()

    function TestComponent() {
      const { data } = useQuery({
        queryKey: ["test"],
        queryFn: () => Promise.resolve("ok"),
      })
      return <div>{data}</div>
    }

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("ok")).toBeInTheDocument()
    })
  })

  it("next/font mock works", () => {
    const font = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
    expect(font.variable).toBe("--font-geist-sans")
    const div = document.createElement("div")
    div.className = font.className
    expect(div.className).toBe("geist-sans")
  })
})
