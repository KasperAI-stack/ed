import Link from "next/link";

// Midlertidig forside. Case-siden bygges i trin 6.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-6 py-24">
      <h1 className="text-4xl font-extrabold">Én hjerne. Tre agenter. Én koordinator, der styrer dem.</h1>
      <p className="mt-4 text-lg text-navy/80">Case-siden er på vej. Demoshoppen virker allerede.</p>
      <Link href="/demo/" className="mt-8 w-fit rounded-full bg-coral px-6 py-3 font-semibold text-white">
        Se rolle-agenten live
      </Link>
    </main>
  );
}
