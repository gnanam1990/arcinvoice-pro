export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 py-24 text-center sm:items-start sm:text-left">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          ArcInvoice Pro
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Project scaffold is ready
        </h1>
        <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          This is a production-quality Next.js TypeScript foundation (App
          Router, Tailwind CSS, ESLint, pnpm,{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-900">
            src/
          </code>
          , and{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-900">
            @/*
          </code>{" "}
          imports). Application features will be added next.
        </p>
      </main>
    </div>
  );
}
