// Small spinning circle used as the "AI is working" indicator. Uses the
// .ts-spinner CSS class defined in index.css (a single @keyframes does the
// rotation; the element itself is a CSS-only ring with one transparent
// quadrant). `size` controls the box; `thickness` controls the ring width.
export function Spinner({ size = 14, thickness = 2, color, style }) {
  return (
    <span
      className="ts-spinner"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderWidth: thickness,
        color,
        ...style,
      }}
    />
  );
}
