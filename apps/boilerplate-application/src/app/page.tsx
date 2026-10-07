import { Button } from "@/components/ui/button";
import { runWelcomeProgram } from "@/lib/welcome";

export default function HomePage() {
  const content = runWelcomeProgram();

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="flex max-w-xl flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {content.headline}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          {content.description}
        </p>
        <Button asChild>
          <a href="https://nextjs.org/docs" target="_blank" rel="noreferrer">
            Open the Next.js docs
          </a>
        </Button>
      </section>
    </main>
  );
}
