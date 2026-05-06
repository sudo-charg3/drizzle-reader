'use client';

export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7f4ef',
      fontFamily: "'Lora', serif",
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌧</div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 400, color: '#3d3530', marginBottom: '0.5rem' }}>
        You&apos;re offline
      </h1>
      <p style={{ color: '#8a7f7a', fontSize: '1rem', maxWidth: '320px', lineHeight: 1.6 }}>
        Drizzle Reader needs a connection to load. Books you&apos;ve downloaded are still available — open the app when connected once to access them.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '2rem',
          padding: '0.75rem 2rem',
          borderRadius: '100px',
          border: '1px solid #c8b8b0',
          background: 'transparent',
          color: '#3d3530',
          fontSize: '0.9rem',
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Try again
      </button>
    </div>
  );
}
