export default function App() {
  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        color: '#111827',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <section>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(72px, 18vw, 160px)',
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: '-0.05em',
          }}
        >
          404
        </h1>
        <p
          style={{
            margin: '16px 0 0',
            fontSize: 'clamp(18px, 4vw, 28px)',
            fontWeight: 600,
          }}
        >
          Page Not Found
        </p>
      </section>
    </main>
  );
}
