// Marca de Vowen: cuadrado redondeado morado con un trazo "V/onda" en blanco.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="9" fill="rgb(var(--brand))" />
      <path
        d="M8 11.5c2.4 0 3.2 9 5.6 9 2.2 0 2.6-6 4.2-6 1.1 0 1.5 3 2.6 3 1.3 0 1.7-4.2 3.6-4.2"
        stroke="white"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
