import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="app">
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Page not found</h2>
        <p style={{ color: 'var(--color-muted, #888)' }}>The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" style={{ color: 'var(--color-accent, #0070f3)', textDecoration: 'none' }}>Return home</Link>
      </main>
    </div>
  )
}
