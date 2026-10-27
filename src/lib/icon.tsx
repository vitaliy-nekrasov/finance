export function renderIcon(px: number) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: px * 0.22,
        background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
        color: '#fff',
        fontSize: px * 0.62,
        fontWeight: 700,
      }}
    >
      ₴
    </div>
  );
}
