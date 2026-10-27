/**
 * Liquid-glass style app icon, drawn with gradients only (next/og has no blur or backdrop-filter).
 * iOS masks apple-touch-icons itself, so the Apple icon must be full-bleed: `rounded: false`.
 */
export function renderIcon(px: number, { rounded = true }: { rounded?: boolean } = {}) {
  const u = (f: number) => px * f;
  const tile = u(0.64);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: rounded ? u(0.22) : 0,
        background: '#07070d',
      }}
    >
      {/* Glow blobs, as in the app background */}
      <div
        style={{
          position: 'absolute',
          left: u(-0.3),
          top: u(-0.3),
          width: u(1.1),
          height: u(1.1),
          background: 'radial-gradient(circle at center, rgba(124,58,237,0.95) 0%, rgba(124,58,237,0) 62%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: u(0.2),
          top: u(0.2),
          width: u(1.1),
          height: u(1.1),
          background: 'radial-gradient(circle at center, rgba(6,182,212,0.9) 0%, rgba(6,182,212,0) 60%)',
        }}
      />

      {/* Glass tile */}
      <div
        style={{
          width: tile,
          height: tile,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: tile * 0.3,
          border: `${u(0.007)}px solid rgba(255,255,255,0.55)`,
          background: 'linear-gradient(150deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.22) 100%)',
          boxShadow: `0 ${u(0.04)}px ${u(0.09)}px rgba(0,0,0,0.45), inset 0 ${u(0.012)}px ${u(0.02)}px rgba(255,255,255,0.65), inset 0 -${u(0.012)}px ${u(0.03)}px rgba(103,232,249,0.35)`,
        }}
      >
        {/* Specular highlight across the top */}
        <div
          style={{
            position: 'absolute',
            left: tile * 0.08,
            top: tile * 0.04,
            width: tile * 0.84,
            height: tile * 0.42,
            borderRadius: tile * 0.3,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            color: '#fff',
            fontSize: tile * 0.78,
            fontWeight: 700,
            lineHeight: 1,
            marginTop: tile * -0.02,
            textShadow: `0 ${u(0.012)}px ${u(0.03)}px rgba(30,10,80,0.55)`,
          }}
        >
          ₴
        </div>
      </div>
    </div>
  );
}
