import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, polygon, optimism, base } from '@reown/appkit/networks'

// Reown Project ID
export const projectId = '877a8bbbfa082040558e6b5a62dcf45b'

// Metadata de la aplicación
export const metadata = {
  name: 'Antigravity Aura',
  description: 'Redimensionamiento inteligente de imágenes para redes sociales',
  url: 'https://redimension.ai',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Redes soportadas
export const networks = [mainnet, arbitrum, polygon, optimism, base]

// Configuración del adaptador Wagmi
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig
