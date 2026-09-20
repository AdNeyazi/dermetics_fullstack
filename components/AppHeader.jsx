'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AppHeader({ showBrand = true, brandHref = '/', leftSlot = null, brandSuffix = null }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-start">
          {leftSlot}
          {showBrand ? (
            <>
              <Link href={brandHref} className="brand gold-text" style={{ textDecoration: 'none' }}>
                DERMATICS
              </Link>
              {brandSuffix ? <span className="header-brand-suffix">{brandSuffix}</span> : null}
            </>
          ) : (
            !leftSlot ? <span /> : null
          )}
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
