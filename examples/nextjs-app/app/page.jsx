export default function HomePage() {
  return (
    <div>
      <h1>RedirectKit Demonstration App</h1>
      <p>This Next.js application verifies RedirectKit build-time integration and redirects.</p>
      <ul>
        <li><a href="/old-about">/old-about (308 &rarr; /about)</a></li>
        <li><a href="/summer-sale">/summer-sale (307 &rarr; /deals/summer)</a></li>
        <li><a href="/old-blog/my-test-post">/old-blog/my-test-post (308 &rarr; /blog/my-test-post)</a></li>
        <li><a href="/from-custom-next-config">/from-custom-next-config (Merged custom redirect)</a></li>
      </ul>
    </div>
  );
}
