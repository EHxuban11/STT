export default function Logo() {
  return (
    <a href="#top" className="group inline-flex items-center gap-2.5">
      <span
        className="text-2xl leading-none transition-transform duration-200 group-hover:rotate-12"
        aria-hidden
      >
        🥱
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        YawningFace
        <span className="font-medium text-muted-foreground"> · STT</span>
      </span>
    </a>
  );
}
