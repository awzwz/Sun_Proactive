import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  backUrl?: string;
  backLabel?: string;
}

export function PlaceholderPage({ 
  title, 
  description = "Этот раздел находится в активной разработке. Скоро здесь появится новый функционал мощного ИИ.",
  backUrl = "/curator/dashboard",
  backLabel = "Вернуться на Дашборд"
}: PlaceholderPageProps) {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center p-12 mt-12 max-w-2xl mx-auto text-center rounded-3xl bg-surface-container-lowest shadow-sm border border-surface-container">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            construction
          </span>
        </div>
        <h1 className="text-3xl font-black font-headline text-on-surface mb-4 tracking-tight">
          {title}
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed mb-8 max-w-md">
          {description}
        </p>
        <Link 
          href={backUrl}
          className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          {backLabel}
        </Link>
      </div>
    </AppShell>
  );
}
