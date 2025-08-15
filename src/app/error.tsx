"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-md card-fallback p-6 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full bg-destructive/15 p-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">حدث خطأ غير متوقع</h1>
            <p className="text-sm opacity-80">
              نأسف للإزعاج. يمكنك المحاولة مرة أخرى.
            </p>
            {error?.digest && (
              <p className="text-xs opacity-60">رمز التتبّع: {error.digest}</p>
            )}
            <div className="pt-3">
              <Button onClick={() => reset()} className="gap-2">
                <RotateCcw className="h-4 w-4" /> إعادة المحاولة
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
