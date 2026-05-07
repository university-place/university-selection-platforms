
import './globals.css'
export const metadata = {
  title: 'University Selection Platform',
  description: 'Ministry of Education - University Selection System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
