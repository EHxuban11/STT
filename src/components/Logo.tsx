// Marca de Yawning Face: el emoji "yawning face" sobre amarillo (logo de la org).
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt="Yawning Face"
      draggable={false}
      className="rounded-[22%] object-cover shadow-sm"
    />
  );
}
