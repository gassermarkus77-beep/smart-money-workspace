import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';

export default function SocialPage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="max-w-[1200px] mx-auto w-full px-6 py-16 flex-1">
        <h1 className="text-3xl font-semibold tracking-tight">Community</h1>
        <p className="mt-2 text-text-muted">Ideas, charts, and conversation from traders worldwide.</p>
        <p className="mt-8 text-text-subtle text-sm">See <a className="text-accent hover:underline" href="/ideas">/ideas</a> for the public idea feed.</p>
      </section>
      <SiteFooter />
    </main>
  );
}
