import { HELP_CONTACTS } from "@/lib/contact-info";

export default function HelpContacts() {
  return (
    <div className="not-prose rounded-xl border border-line bg-surface p-5 mt-8">
      <h2 className="text-sm font-semibold text-ink mb-3">더 자세히 물어보고 싶다면</h2>
      <ul className="flex flex-col gap-2.5">
        {HELP_CONTACTS.map((c) => (
          <li key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-medium text-accent hover:underline"
            >
              {c.name}
            </a>
            <span className="text-ink-soft">
              {c.phone && <span className="font-mono">☎ {c.phone}</span>}
              {c.phone && " · "}
              {c.note}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
