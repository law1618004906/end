import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-lg card-fallback p-8 rounded-xl text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 text-primary grid place-items-center">
          <SearchX className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
        <p className="text-sm opacity-80">تأكد من العنوان أو ارجع إلى الصفحة الرئيسية.</p>
        <div className="pt-2">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" /> الرئيسية
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
