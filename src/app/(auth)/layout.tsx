import { PAGE_MIN_HEIGHT_CLASS } from "@/lib/layout";

const AUTH_BRAND_IMAGE_URL =
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1600&q=80";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className={`${PAGE_MIN_HEIGHT_CLASS} grid lg:grid-cols-2`}>
      <div
        aria-hidden="true"
        data-testid="auth-brand-panel"
        className="hidden bg-zinc-950 bg-cover bg-center lg:block"
        style={{ backgroundImage: `url(${AUTH_BRAND_IMAGE_URL})` }}
      />

      <div
        data-testid="auth-form-panel"
        className="flex min-w-0 items-center justify-center p-4 sm:p-6 lg:p-8"
      >
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
