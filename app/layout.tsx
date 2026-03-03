import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import { Web3Provider } from '@/app/context/Web3Provider'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Antigravity | Smart Resizer',
  description: 'Redimensionamiento inteligente de imágenes para redes sociales: TikTok, Instagram, LinkedIn y Twitter/X, con efecto Aura y análisis OCR técnico.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} ${jetbrains.variable}`}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  )
}
