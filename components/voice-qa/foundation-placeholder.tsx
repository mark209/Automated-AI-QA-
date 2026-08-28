import Link from "next/link";

export function FoundationPlaceholder({ title, description }: { title: string; description: string }) {
  return <section className="mx-auto max-w-3xl px-6 py-16"><Link href="/" className="text-sm text-blue-700">← Back to dashboard</Link><h1 className="font-display mt-8 text-3xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted">{description}</p><div className="surface mt-8 rounded-xl p-8"><p className="font-medium">This foundation route is ready.</p><p className="mt-2 text-sm text-muted">The data workflow will be connected in the next implementation phase.</p></div></section>;
}
