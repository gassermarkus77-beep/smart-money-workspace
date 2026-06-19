import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';

export default function ScannerPage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="max-w-[1200px] mx-auto w-full px-6 py-16 flex-1">
        <h1 className="text-3xl font-semibold tracking-tight">Market Scanner</h1>
        <p className="mt-2 text-text-muted">Filter the universe by 200+ technical and fundamental fields.</p>
        <p className="mt-8 text-text-subtle text-sm">Coming in v1.0 — see <code>BLUEPRINT.md</code> § Phase 3.4.</p>
      </section>
      <SiteFooter />
    </main>
  );
}
