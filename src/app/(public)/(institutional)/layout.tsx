/**
 * Prompt 20 (gap analysis): shared wrapper for the institutional/legal
 * pages the public footer/nav already linked to before any of them
 * existed (src/app/(public)/layout.tsx) -- a route group (invisible in
 * the URL) so `/como-funciona`, `/termos`, etc. stay top-level routes
 * while sharing one prose-style layout instead of repeating it 7 times.
 */
export default function InstitutionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <article className="flex flex-col gap-4 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-neutral-900 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-neutral-900 [&_p]:text-neutral-700 [&_li]:text-neutral-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </article>
    </div>
  );
}
