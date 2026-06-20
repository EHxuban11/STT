import { HeroCard } from "@/components/ui";

export default function Help() {
  return (
    <div className="mx-auto max-w-4xl space-y-3 pt-2">
      <HeroCard
        title="Help & Support"
        body="Guides, keyboard shortcuts and ways to get in touch."
      />
      <div className="grid grid-cols-2 gap-3">
        <a className="card-soft hover:bg-card-hover" href="#">
          <div className="font-semibold text-ink">Documentation</div>
          <div className="text-sm text-muted">Learn how to use every feature.</div>
        </a>
        <a className="card-soft hover:bg-card-hover" href="#">
          <div className="font-semibold text-ink">Contact Us</div>
          <div className="text-sm text-muted">Reach the team for help.</div>
        </a>
      </div>
    </div>
  );
}
