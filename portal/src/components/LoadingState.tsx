function Shimmer({ width = '100%', height = '20px', borderRadius = '12px' }: {
  width?: string
  height?: string
  borderRadius?: string
}): React.JSX.Element {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  )
}

export default function LoadingState(): React.JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        padding: '24px 16px 100px',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <Shimmer width="80px" height="80px" borderRadius="50%" />
        <div style={{ height: '12px' }} />
        <Shimmer width="180px" height="28px" />
        <div style={{ height: '8px' }} />
        <Shimmer width="220px" height="16px" />
      </div>

      {/* QR card */}
      <div style={{ marginBottom: '16px' }}>
        <Shimmer width="100%" height="80px" borderRadius="16px" />
      </div>

      {/* Membership card */}
      <Shimmer width="100%" height="160px" borderRadius="16px" />

      <div style={{ height: '16px' }} />

      {/* Action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Shimmer width="100%" height="88px" borderRadius="16px" />
        <Shimmer width="100%" height="88px" borderRadius="16px" />
      </div>
    </div>
  )
}
