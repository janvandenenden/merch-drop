import { z } from "zod"

const BASE = "https://api.printful.com"
const BC3001_PRODUCT_ID = 71

export class PrintfulError extends Error {
  constructor(
    public readonly code: number,
    public readonly reason: string,
    message: string,
  ) {
    super(message)
    this.name = "PrintfulError"
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const key = process.env.PRINTFUL_API_KEY
  if (!key) throw new PrintfulError(0, "configuration", "PRINTFUL_API_KEY not set")

  const storeId = process.env.PRINTFUL_STORE_ID
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(storeId ? { "X-PF-Store-Id": storeId } : {}),
      ...options.headers,
    },
  })

  const body = (await res.json()) as {
    code: number
    result: unknown
    error?: { reason: string; message: string }
  }

  if (!res.ok || body.code >= 400) {
    const reason = body.error?.reason ?? "unknown"
    const message = body.error?.message ?? String(body.result) ?? "Printful error"
    throw new PrintfulError(body.code ?? res.status, reason, message)
  }

  return schema.parse(body.result)
}

// ─── Submit order ─────────────────────────────────────────────────────────────

// Matches the actual Printful API response shape (snake_case), then transforms to camelCase.
const printfulOrderSchema = z
  .looseObject({
    id: z.number(),
    status: z.string(),
    recipient: z.looseObject({
      name: z.string(),
      email: z.string().optional(),
      address1: z.string(),
      city: z.string(),
      country_code: z.string(),
      zip: z.string(),
    }),
    items: z.array(
      z.looseObject({
        id: z.number(),
        variant_id: z.number(),
        quantity: z.number(),
        price: z.number().optional(),
      }),
    ),
  })
  .transform((raw) => ({
    ...raw,
    recipient: {
      ...raw.recipient,
      countryCode: raw.recipient.country_code,
    },
    items: raw.items.map((item) => ({
      ...item,
      variantId: item.variant_id,
    })),
  }))

export type PrintfulOrder = z.infer<typeof printfulOrderSchema>

export type SubmitOrderParams = {
  recipient: {
    name: string
    email: string
    address1: string
    city: string
    stateCode?: string
    countryCode: string
    zip: string
  }
  items: {
    variantId: number
    quantity: number
    printFileUrl: string
  }[]
}

export async function submitOrder(params: SubmitOrderParams): Promise<PrintfulOrder> {
  return request(
    "/orders",
    printfulOrderSchema,
    {
      method: "POST",
      body: JSON.stringify({
        recipient: {
          name: params.recipient.name,
          email: params.recipient.email,
          address1: params.recipient.address1,
          city: params.recipient.city,
          state_code: params.recipient.stateCode,
          country_code: params.recipient.countryCode,
          zip: params.recipient.zip,
        },
        items: params.items.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
          files: [{ type: "front_large", url: item.printFileUrl }],
        })),
      }),
    },
  )
}

// ─── Generate mockup ──────────────────────────────────────────────────────────

const mockupTaskSchema = z.looseObject({
  task_key: z.string(),
})

const mockupResultSchema = z.looseObject({
  status: z.string(),
  mockups: z
    .array(z.looseObject({ placement: z.string(), mockup_url: z.string().url() }))
    .optional(),
  error: z.string().optional(),
})

export async function generatePrintfulMockupUrl(
  printFileUrl: string,
  variantIds: number[],
): Promise<string> {
  const { task_key } = await request(
    `/mockup-generator/create-task/${BC3001_PRODUCT_ID}`,
    mockupTaskSchema,
    {
      method: "POST",
      body: JSON.stringify({
        variant_ids: variantIds,
        files: [
          {
            placement: "front_large",
            image_url: printFileUrl,
            position: {
              area_width: 2250,
              area_height: 2700,
              width: 2250,
              height: 2700,
              top: 0,
              left: 0,
            },
          },
        ],
      }),
    },
  )

  // Poll until completed (max 60s, 2s interval; backs off on rate limit)
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))

    try {
      const result = await request(
        `/mockup-generator/task?task_key=${encodeURIComponent(task_key)}`,
        mockupResultSchema,
      )

      if (result.status === "completed") {
        const url = result.mockups?.find((m) => m.placement === "front_large")?.mockup_url
        if (!url) throw new PrintfulError(0, "no_mockup", "No front mockup in Printful response")
        return url
      }

      if (result.status === "failed") {
        throw new PrintfulError(0, "mockup_failed", result.error ?? "Mockup generation failed")
      }
    } catch (err) {
      if (!(err instanceof PrintfulError)) throw err
      // Rate limited — parse wait time from message and sleep it out
      const seconds = err.message.match(/after (\d+) seconds/)?.[1]
      if (seconds) {
        await new Promise((r) => setTimeout(r, (parseInt(seconds) + 1) * 1000))
      } else {
        throw err
      }
    }
  }

  throw new PrintfulError(0, "timeout", "Mockup generation timed out after 60s")
}

// ─── Order estimate ───────────────────────────────────────────────────────────

const orderEstimateSchema = z.looseObject({
  costs: z.looseObject({
    subtotal: z.union([z.string(), z.number()]).transform(String),
    vat: z.union([z.string(), z.number()]).transform(String),
  }),
})

export async function estimateOrderCost(
  address: ShippingAddress,
  items: ShippingItem[],
  printFileUrl: string,
): Promise<number> {
  const result = await request(
    "/orders/estimate-costs",
    orderEstimateSchema,
    {
      method: "POST",
      body: JSON.stringify({
        recipient: {
          name: "Customer",
          address1: address.address1,
          city: address.city,
          state_code: address.stateCode,
          country_code: address.countryCode,
          zip: address.zip,
        },
        items: items.map((i) => ({
          variant_id: i.variantId,
          quantity: i.quantity,
          files: [{ url: printFileUrl }],
        })),
      }),
    },
  )
  const subtotalCents = Math.round(parseFloat(result.costs.subtotal) * 100)
  const vatCents = Math.round(parseFloat(result.costs.vat) * 100)
  return subtotalCents + vatCents
}

// ─── Shipping rates ───────────────────────────────────────────────────────────

const shippingRateSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  rate: z.string(),
  currency: z.string(),
  minDeliveryDays: z.number().optional(),
  maxDeliveryDays: z.number().optional(),
})

export type ShippingRate = z.infer<typeof shippingRateSchema>

export type ShippingAddress = {
  address1: string
  city: string
  stateCode?: string
  countryCode: string
  zip: string
}

export type ShippingItem = {
  variantId: number
  quantity: number
}

export async function getShippingRates(
  address: ShippingAddress,
  items: ShippingItem[],
): Promise<ShippingRate[]> {
  return request(
    "/shipping/rates",
    z.array(shippingRateSchema),
    {
      method: "POST",
      body: JSON.stringify({
        recipient: {
          address1: address.address1,
          city: address.city,
          state_code: address.stateCode,
          country_code: address.countryCode,
          zip: address.zip,
        },
        items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
        currency: "USD",
      }),
    },
  )
}
