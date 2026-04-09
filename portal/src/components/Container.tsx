interface ContainerProps {
  children: React.ReactNode
}

export default function Container({ children }: ContainerProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `
          radial-gradient(ellipse at top, rgba(212, 175, 55, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at bottom right, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
          radial-gradient(ellipse at bottom left, rgba(168, 85, 247, 0.08) 0%, transparent 50%),
          #0a0a0a
        `,
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(212, 175, 55, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
