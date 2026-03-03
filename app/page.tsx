import { ConnectButton } from '@/app/components/ConnectButton'
import { ImageResizer } from '@/app/components/ImageResizer'

export default function Home() {
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <div className="header-title">
            <h1>
              ANTIGRAVITY <span className="aura-text">AURA</span>
            </h1>
            <p>Redimensionamiento inteligente para sistemas complejos</p>
          </div>
          <div className="wallet-section">
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <ImageResizer />
    </div>
  )
}
