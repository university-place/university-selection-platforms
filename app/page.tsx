export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>University Selection Platform</h1>
      <p>Welcome to the Ministry of Education Portal</p>
      <hr />
      <p>API Routeffs available:</p>
      <ul>
        <li><code>/api/auth/...</code> - Authentication</li>
        <li><code>/api/moe/upload</code> - Student data upload</li>
      </ul>
    </main>
  )
}
