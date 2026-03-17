import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'SWORN Explorer - Trust Protocol on Solana Devnet',
  description: 'Public blockchain explorer for the SWORN Trust Protocol on Solana devnet. View agents, contracts, and on-chain activity.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
          {children}
        </main>
        <footer style={{
          textAlign: 'center',
          padding: '2rem 1rem',
          borderTop: '1px solid var(--border)',
          color: 'var(--text-dim)',
          fontSize: '0.75rem',
          marginTop: '2rem'
        }}>
          <div>SWORN Trust Protocol on Solana Devnet</div>
          <div style={{ marginTop: '0.25rem' }}>
            <a href="https://sworn.chitacloud.dev" target="_blank" rel="noopener">sworn.chitacloud.dev</a>
            {' | '}
            <a href="https://sworn.chitacloud.dev/whitepaper" target="_blank" rel="noopener">Whitepaper</a>
            {' | '}
            <a href="https://github.com/alexchenai/trust-protocol" target="_blank" rel="noopener">GitHub</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
