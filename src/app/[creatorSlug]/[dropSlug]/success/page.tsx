import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  params: Promise<{ creatorSlug: string; dropSlug: string }>
}

export default async function SuccessPage({ params }: Props) {
  const { creatorSlug, dropSlug } = await params

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Order confirmed</CardTitle>
          <CardDescription>Thanks for your purchase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your shirt is being printed and will ship in 3–5 business days. You&apos;ll receive a
            confirmation email shortly.
          </p>
          <a
            href={`/${creatorSlug}/${dropSlug}`}
            className="text-sm underline text-muted-foreground"
          >
            Back to drop
          </a>
        </CardContent>
      </Card>
    </main>
  )
}
