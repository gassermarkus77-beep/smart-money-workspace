export default function AdminHome(): JSX.Element {
  return (
    <main className="min-h-screen p-8 bg-slate-950 text-slate-100">
      <h1 className="text-3xl font-semibold">FINBERG Admin</h1>
      <p className="mt-2 text-slate-400">Operator console for FINBERG MARKETS.</p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Users" stat="—" sub="MAU / DAU" />
        <Card title="Subscriptions" stat="—" sub="ARR" />
        <Card title="Market data" stat="OK" sub="provider health" />
        <Card title="Support" stat="—" sub="open tickets" />
        <Card title="Audit" stat="—" sub="events / 24h" />
        <Card title="System" stat="OK" sub="SLO burn rate" />
      </div>
    </main>
  );
}

function Card({ title, stat, sub }: { title: string; stat: string; sub: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{stat}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}
