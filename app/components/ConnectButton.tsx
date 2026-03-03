'use client'

import { useEffect, useState, useCallback } from 'react'

// Project ID de Reown (para WalletConnect mobile)
const PROJECT_ID = '877a8bbbfa082040558e6b5a62dcf45b'

interface WalletProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, callback: (args: unknown) => void) => void
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  isPhantom?: boolean
  providers?: WalletProvider[]
}

declare global {
  interface Window {
    ethereum?: WalletProvider
  }
}

export function ConnectButton() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [availableWallets, setAvailableWallets] = useState<string[]>([])

  // Detectar wallets disponibles
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const wallets: string[] = []
    const eth = window.ethereum

    if (eth) {
      if (eth.providers?.length) {
        eth.providers.forEach(p => {
          if (p.isMetaMask) wallets.push('metamask')
          if (p.isCoinbaseWallet) wallets.push('coinbase')
          if (p.isPhantom) wallets.push('phantom')
        })
      } else {
        if (eth.isMetaMask) wallets.push('metamask')
        if (eth.isCoinbaseWallet) wallets.push('coinbase')
        if (eth.isPhantom) wallets.push('phantom')
      }
    }
    
    // Siempre mostrar WalletConnect como opción
    wallets.push('walletconnect')
    
    setAvailableWallets([...new Set(wallets)])
  }, [])

  // Obtener el provider específico
  const getProvider = useCallback((walletType?: string): WalletProvider | null => {
    if (typeof window === 'undefined' || !window.ethereum) return null
    
    const eth = window.ethereum
    
    if (eth.providers?.length && walletType) {
      const provider = eth.providers.find(p => {
        if (walletType === 'metamask') return p.isMetaMask
        if (walletType === 'coinbase') return p.isCoinbaseWallet
        if (walletType === 'phantom') return p.isPhantom
        return false
      })
      if (provider) return provider
    }
    
    return eth
  }, [])

  // Conectar con una wallet específica
  const connectWallet = useCallback(async (walletType: string) => {
    setIsConnecting(true)
    setShowModal(false)

    try {
      if (walletType === 'walletconnect') {
        // Para WalletConnect, abrir el link oficial
        window.open(`https://walletconnect.com/explorer?projectId=${PROJECT_ID}`, '_blank')
        setIsConnecting(false)
        return
      }

      const provider = getProvider(walletType)
      
      if (!provider) {
        // Redirigir a la página de instalación
        const urls: Record<string, string> = {
          metamask: 'https://metamask.io/download/',
          coinbase: 'https://www.coinbase.com/wallet',
          phantom: 'https://phantom.app/download'
        }
        window.open(urls[walletType] || urls.metamask, '_blank')
        setIsConnecting(false)
        return
      }

      const accounts = await provider.request({ 
        method: 'eth_requestAccounts' 
      }) as string[]
      
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0])
        localStorage.setItem('connectedWallet', walletType)
      }
    } catch (error: unknown) {
      const err = error as { code?: number }
      console.error('Error connecting:', err)
      if (err.code === 4001) {
        // Usuario canceló
      }
    } finally {
      setIsConnecting(false)
    }
  }, [getProvider])

  // Desconectar
  const disconnect = useCallback(() => {
    setAddress(null)
    localStorage.removeItem('connectedWallet')
  }, [])

  // Copiar dirección
  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address)
    }
  }, [address])

  // Verificar conexión existente
  useEffect(() => {
    const savedWallet = localStorage.getItem('connectedWallet')
    if (!savedWallet) return

    const provider = getProvider(savedWallet)
    if (!provider) return

    provider.request({ method: 'eth_accounts' })
      .then((accounts) => {
        const accs = accounts as string[]
        if (accs && accs.length > 0) {
          setAddress(accs[0])
        }
      })
      .catch(() => {})

    // Escuchar cambios
    provider.on('accountsChanged', (accounts: unknown) => {
      const accs = accounts as string[]
      if (accs && accs.length > 0) {
        setAddress(accs[0])
      } else {
        setAddress(null)
      }
    })
  }, [getProvider])

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  // Wallet options con iconos
  const walletOptions = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊', color: '#E2761B' },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: '💰', color: '#0052FF' },
    { id: 'phantom', name: 'Phantom', icon: '👻', color: '#AB9FF2' },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🔗', color: '#3B99FC' },
  ]

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
    <>
      <button 
        onClick={() => setShowModal(true)} 
        className="btn-wallet"
        disabled={isConnecting}
      >
        <span className="wallet-icon">{isConnecting ? '⏳' : '🔗'}</span>
        <span className="wallet-text">
          {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
        </span>
      </button>

      {/* Modal de selección de wallet */}
      {showModal && (
        <div className="wallet-modal" onClick={() => setShowModal(false)}>
          <div className="wallet-modal-content" onClick={e => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <h3>Conecta tu Wallet</h3>
              <button 
                className="wallet-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="wallet-modal-body">
              {walletOptions.map(wallet => (
                <button
                  key={wallet.id}
                  className="wallet-option"
                  onClick={() => connectWallet(wallet.id)}
                  style={{ '--wallet-color': wallet.color } as React.CSSProperties}
                >
                  <span className="wallet-option-icon">{wallet.icon}</span>
                  <div className="wallet-option-info">
                    <strong>{wallet.name}</strong>
                    <small>
                      {availableWallets.includes(wallet.id) && wallet.id !== 'walletconnect'
                        ? 'Detectado' 
                        : wallet.id === 'walletconnect' 
                          ? 'Escanear QR'
                          : 'Instalar'}
                    </small>
                  </div>
                  <span className="wallet-option-arrow">→</span>
                </button>
              ))}
            </div>
            <p className="wallet-modal-footer">
              Proyecto ID: {PROJECT_ID.slice(0, 8)}...
            </p>
          </div>
        </div>
      )}
    </>
  )
}
