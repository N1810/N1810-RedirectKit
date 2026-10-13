export const metadata = {
  title: 'RedirectKit Example Next.js App',
  description: 'Demonstrating seamless Next.js redirect management'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <header style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
          <h2>RedirectKit Next.js Example</h2>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
