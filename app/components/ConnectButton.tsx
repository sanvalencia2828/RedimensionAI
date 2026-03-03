'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (args: unknown) => void) => void
      isMetaMask?: boolean
      providers?: Array<{ isMetaMask?: boolean }>
    }
  }
}

export function ConnectButton() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Obtener el provider de MetaMask
  const getProvider = () => {
    if (typeof window === 'undefined') return null
    
    // Si hay múltiples providers, buscar MetaMask
    if (window.ethereum?.providers?.length) {
      const metamask = window.ethereum.providers.find(p => p.isMetaMask)
      if (metamask) return metamask
    }
    
    if (window.ethereum?.isMetaMask) {
      return window.ethereum
    }
    
    return window.ethereum || null
  }

  // Conectar wallet
  const connect = async () => {
    const provider = getProvider()
    
    if (!provider) {
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    setIsConnecting(true)

    try {
      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      }) as string[]
      
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
      }
    } catch (error) {
      console.error('Error connecting:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  // Desconectar
  const disconnect = () => {
    setAddress(null)
  }

  // Copiar dirección
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
    }
  }

  // Verificar conexión existente y escuchar cambios
  useEffect(() => {
    const provider = getProvider()
    if (!provider) return

    // Verificar si ya está conectado
    provider.request({ method: 'eth_accounts' })
      .then((accounts) => {
        const accs = accounts as string[]
        if (accs && accs.length > 0) {
          setAddress(accs[0])
        }
      })
      .catch(() => {})

    // Escuchar cambios de cuenta
    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[]
      if (accs && accs.length > 0) {
        setAddress(accs[0])
      } else {
        setAddress(null)
      }
    }

    provider.on('accountsChanged', handleAccountsChanged)
  }, [])

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (address) {
    return (
      <div className="wallet-info connected">
        <button
          onClick={copyAddress}
          className="wallet-address"
          title={`${address} (click para copiar)`}
        >
          {truncateAddress(address)}
        </button>
        <button
          onClick={disconnect}
          className="btn-disconnect"
          title="Desconectar"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <button 
      onClick={connect} 
      className="btn-wallet"
      disabled={isConnecting}
    >
      <span className="wallet-icon">{isConnecting ? '⏳' : '🔗'}</span>
      <span className="wallet-text">
        {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
      </span>
    </button>
  )
}
