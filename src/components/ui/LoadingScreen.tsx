import { LayoutDashboard } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: 20,
      background: 'var(--bg-base)', fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        width: 56, height: 56,
        background: 'linear-gradient(135deg, var(--accent), hsl(217, 80%, 45%))',
        borderRadius: 'var(--radius-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-accent)',
        animation: 'pulse-ring 2s infinite',
      }}>
        <LayoutDashboard size={28} color="white" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Project Tracking Tool
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 6 }}>
          Initializing local database...
        </div>
      </div>
      <div style={{
        width: 200, height: 3, background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', background: 'var(--accent)',
          borderRadius: 'var(--radius-full)',
          animation: 'shimmer 1.5s infinite',
          backgroundImage: 'linear-gradient(90deg, var(--accent) 25%, hsl(217, 91%, 75%) 50%, var(--accent) 75%)',
          backgroundSize: '200% 100%',
        }} />
      </div>
    </div>
  );
}
