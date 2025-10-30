'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Header from './header'

export default function ConditionalHeader() {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  useEffect(() => {
    // 动态调整main元素的padding
    const mainElement = document.querySelector('main')
    if (mainElement) {
      if (isAuthPage) {
        mainElement.style.paddingTop = '0'
      } else {
        mainElement.style.paddingTop = '4rem' // pt-16 equivalent
      }
    }
  }, [isAuthPage])

  if (isAuthPage) {
    return null
  }

  return <Header />
}