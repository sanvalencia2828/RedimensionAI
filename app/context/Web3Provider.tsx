'use client'

import { type ReactNode } from 'react'

// Provider simplificado que funciona sin las dependencias pesadas de Wagmi
export function Web3Provider({
  children,
}: {
  children: ReactNode
  initialState?: unknown
}) {
  return <>{children}</>
}
