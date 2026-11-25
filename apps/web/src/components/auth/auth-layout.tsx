import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

export function AuthLayout({ title, lead, children, footer }: { title: string; lead?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo size="large" className="mb-8" />
      <Card className="w-full max-w-[400px] p-7">
        <h1 className="text-[20px] font-bold tracking-tight">{title}</h1>
        {lead && <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{lead}</p>}
        <div className="mt-6">{children}</div>
      </Card>
      {footer && <p className="mt-5 text-[13px] text-muted-foreground">{footer}</p>}
    </main>
  );
}

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-[12px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
