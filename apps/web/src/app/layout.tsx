import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Metadatos principales de DivinADS
export const metadata: Metadata = {
  title: 'DivinADS - Automatización Inteligente de Meta Ads',
  description: 'Plataforma SaaS para automatizar decisiones de media buying en Meta Ads con IA. Especializada en LATAM.',
  keywords: 'meta ads, facebook ads, automatización, IA, media buying, ROAS, LATAM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        {children}
      </body>
    </html>
  )
}
