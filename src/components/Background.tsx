/** Fixed dark backdrop with two slowly floating blurred blobs. */
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#07070d]">
      <div className="blob absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#7c3aed] opacity-55 blur-[60px]" />
      <div
        className="blob absolute -right-20 top-1/3 h-56 w-56 rounded-full bg-[#06b6d4] opacity-55 blur-[60px]"
        style={{ animationDelay: '-3s' }}
      />
    </div>
  );
}
