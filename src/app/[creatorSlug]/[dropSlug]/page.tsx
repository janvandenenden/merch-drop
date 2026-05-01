import { notFound } from "next/navigation"
import Image from "next/image"
import { getDropBySlug } from "@/lib/drops"
import { getSignedUrl } from "@/lib/storage"
import { calculatePrice, BASE_SHIRT_COST_CENTS } from "@/lib/pricing"
import { BuyForm } from "@/components/drops/buy-form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface Props {
  params: Promise<{ creatorSlug: string; dropSlug: string }>
}

export default async function PublicDropPage({ params }: Props) {
  const { creatorSlug, dropSlug } = await params
  const result = await getDropBySlug(creatorSlug, dropSlug)
  if (!result) notFound()

  const { drop } = result
  const mockupUrl = drop.mockupKey ? await getSignedUrl(drop.mockupKey) : null

  if (drop.status === "pre_live" || drop.status === "paused") {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">{drop.title}</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This drop isn&apos;t live yet. Check back soon.
            </p>
            <p className="text-sm text-muted-foreground">
              Questions?{" "}
              <a href={`mailto:${drop.supportEmail}`} className="underline">
                {drop.supportEmail}
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (drop.status === "closed") {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">{drop.title}</CardTitle>
            <CardDescription>Drop closed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This drop is no longer available.
            </p>
            <p className="text-sm text-muted-foreground">
              Questions?{" "}
              <a href={`mailto:${drop.supportEmail}`} className="underline">
                {drop.supportEmail}
              </a>
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  const { buyerTotal } = calculatePrice(BASE_SHIRT_COST_CENTS, drop.markupCents)
  const priceDisplay = `from $${(buyerTotal / 100).toFixed(2)} + shipping`

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl bg-muted">
            {mockupUrl ? (
              <Image
                src={mockupUrl}
                alt={drop.title}
                width={600}
                height={600}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-muted-foreground">
                No mockup yet
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 py-2">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">{drop.title}</h1>
              {drop.description && (
                <p className="text-muted-foreground">{drop.description}</p>
              )}
            </div>

            <BuyForm dropId={drop.id} priceDisplay={priceDisplay} markupCents={drop.markupCents} />

            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Printed &amp; shipped in 3–5 business days.</p>
              <p>
                Support:{" "}
                <a href={`mailto:${drop.supportEmail}`} className="underline">
                  {drop.supportEmail}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
