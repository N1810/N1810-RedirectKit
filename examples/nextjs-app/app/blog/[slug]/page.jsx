export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  return (
    <div>
      <h1>Blog Post: {slug}</h1>
      <p>This post was redirected from the legacy blog URL structure.</p>
    </div>
  );
}
