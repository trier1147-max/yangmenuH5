import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '洋菜单 - 外文菜单翻译助手',
  description: '拍照识别外文菜单，用AI帮你读懂每一道菜',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '洋菜单',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="max-w-md mx-auto min-h-screen bg-white">
        {children}
      </body>
    </html>
  )
}
