'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Tesseract from 'tesseract.js'

// Configuración de plataformas
const CONFIG = {
  TIKTOK: { width: 1080, height: 1920, ratio: 9 / 16, label: 'TikTok / Reels' },
  INSTAGRAM_POST: { width: 1080, height: 1080, ratio: 1 / 1, label: 'Post Cuadrado' },
  LINKEDIN_BANNER: { width: 1200, height: 627, ratio: 1.91 / 1, label: 'LinkedIn / FB' },
  X_POST: { width: 1600, height: 900, ratio: 16 / 9, label: 'Twitter (X)' },
} as const

type PlatformKey = keyof typeof CONFIG

// Configuración del efecto Aura
const AURA_COLOR = '#00FFFF'
const AURA_BLUR = 40
const AURA_LINE_WIDTH = 6
const AURA_OPACITY = 0.85

// Keywords técnicas para OCR
const TECHNICAL_KEYWORDS: Record<string, number> = {
  contract: 10, soroban: 10, blockchain: 9, ledger: 8, token: 7, wallet: 7,
  address: 6, function: 5, class: 5, struct: 5, interface: 5, async: 4,
  await: 4, return: 3, import: 2, export: 2, const: 2, let: 1, var: 1,
}

interface OcrResult {
  status: 'ok' | 'empty' | 'error'
  confidence: number
  concepts: string[]
  words: number
}

export function ImageResizer() {
  const [platform, setPlatform] = useState<PlatformKey>('TIKTOK')
  const [status, setStatus] = useState('Esperando archivo…')
  const [statusType, setStatusType] = useState<'default' | 'scanning' | 'success' | 'error'>('default')
  const [hasImage, setHasImage] = useState(false)
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentImageRef = useRef<HTMLImageElement | null>(null)

  const log = useCallback((msg: string, type: 'default' | 'scanning' | 'success' | 'error' = 'default') => {
    setStatus(msg)
    setStatusType(type)
  }, [])

  // Cargar imagen
  const loadImage = useCallback((src: string | File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Error cargando la imagen'))

      if (src instanceof File) {
        const url = URL.createObjectURL(src)
        img.src = url
        img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true })
      } else {
        img.src = src
      }
    })
  }, [])

  // Calcular recorte
  const cropRect = useCallback((img: HTMLImageElement, focal: { x: number; y: number }, platformKey: PlatformKey) => {
    const { ratio } = CONFIG[platformKey]
    const sw = img.naturalWidth
    const sh = img.naturalHeight
    const srcRatio = sw / sh

    let cropW: number, cropH: number
    if (srcRatio > ratio) {
      cropH = sh
      cropW = sh * ratio
    } else {
      cropW = sw
      cropH = sw / ratio
    }

    let sx = focal.x * sw - cropW / 2
    let sy = focal.y * sh - cropH / 2
    sx = Math.max(0, Math.min(sx, sw - cropW))
    sy = Math.max(0, Math.min(sy, sh - cropH))

    return { sx, sy, sw: cropW, sh: cropH }
  }, [])

  // Aplicar efecto Aura
  const applyAura = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save()
    ctx.globalAlpha = AURA_OPACITY
    ctx.strokeStyle = AURA_COLOR
    ctx.lineWidth = AURA_LINE_WIDTH
    ctx.shadowColor = AURA_COLOR
    ctx.shadowBlur = AURA_BLUR
    const m = AURA_LINE_WIDTH / 2
    ctx.strokeRect(m, m, w - m * 2, h - m * 2)
    ctx.restore()
  }, [])

  // Renderizar en canvas
  const render = useCallback((img: HTMLImageElement, focal: { x: number; y: number }, platformKey: PlatformKey) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = CONFIG[platformKey]
    canvas.width = width
    canvas.height = height

    const { sx, sy, sw, sh } = cropRect(img, focal, platformKey)
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
    applyAura(ctx, width, height)
  }, [cropRect, applyAura])

  // Extraer conceptos técnicos del texto OCR
  const extractConcepts = useCallback((text: string): string[] => {
    if (!text) return []
    const patterns = [
      /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g,
      /\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/g,
      /\bv?\d+\.\d+(?:\.\d+)?\b/g,
      /\b(?:API|SDK|UI|UX|OCR|AI|ML|CSS|HTML|HTTP|REST|JSON|XML|SQL|GPU|CPU|CDN|DOM|ESM)\b/g,
      /\b[a-z][a-z0-9]*(?:_[a-z0-9]+){1,}\b/g,
      /\b(?:import|export|const|let|var|async|await|class|extends|return|function|typeof|instanceof)\b/g,
      /#[0-9a-fA-F]{3,6}\b/g,
      /\b[a-zA-Z_$][a-zA-Z0-9_$]*\(\)/g,
    ]
    const found = new Set<string>()
    for (const pat of patterns) {
      const m = text.match(pat)
      if (m) m.forEach((t) => found.add(t.trim()))
    }
    return Array.from(found).filter((t) => t.length > 1)
  }, [])

  // OCR con Tesseract
  const runOcr = useCallback(async (img: HTMLImageElement) => {
    log('Iniciando escaneo de conceptos técnicos…', 'scanning')

    try {
      const result = await Tesseract.recognize(img, 'eng+spa', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress ?? 0) * 100)
            log(`Escaneando conceptos técnicos… ${pct}%`, 'scanning')
          }
        },
      })

      const rawText = result.data.text?.trim() || ''
      const confidence = (result.data.confidence ?? 0) / 100
      const concepts = extractConcepts(rawText)
      const words = result.data.words?.length || 0

      if (rawText.length === 0) {
        setOcrResult({ status: 'empty', confidence: 0, concepts: [], words: 0 })
        log('Sin texto detectado en la imagen.', 'default')
      } else {
        setOcrResult({ status: 'ok', confidence, concepts, words })
        log(`OCR OK · ${(confidence * 100).toFixed(1)}% confianza · ${concepts.length} conceptos`, 'success')
      }
    } catch (error) {
      console.error('OCR Error:', error)
      setOcrResult({ status: 'error', confidence: 0, concepts: [], words: 0 })
      log('Error en OCR', 'error')
    }
  }, [log, extractConcepts])

  // Procesar imagen
  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      log('Solo se aceptan imágenes (JPG, PNG, WebP).', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      log('El archivo supera los 10 MB.', 'error')
      return
    }

    setIsProcessing(true)
    setOcrResult(null)
    log(`Cargando imagen para ${CONFIG[platform].label}…`, 'scanning')

    try {
      const url = URL.createObjectURL(file)
      setSourcePreview(url)

      const img = await loadImage(file)
      currentImageRef.current = img
      setHasImage(true)

      log(`Aplicando recorte ${CONFIG[platform].label} y efecto Aura…`, 'scanning')
      render(img, { x: 0.5, y: 0.5 }, platform)

      log('Vista previa lista — ejecutando OCR técnico…', 'scanning')
      await runOcr(img)
    } catch (error) {
      console.error('Process error:', error)
      log('Error procesando la imagen', 'error')
    } finally {
      setIsProcessing(false)
    }
  }, [platform, loadImage, render, runOcr, log])

  // Cambiar plataforma
  const handlePlatformChange = useCallback((newPlatform: PlatformKey) => {
    setPlatform(newPlatform)
    if (currentImageRef.current) {
      render(currentImageRef.current, { x: 0.5, y: 0.5 }, newPlatform)
    }
  }, [render])

  // Descargar imagen
  const handleDownload = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { label } = CONFIG[platform]
    const filename = `antigravity-aura-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/jpeg', 0.92)
  }, [platform])

  // Handlers de drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processImage(file)
  }, [processImage])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }, [processImage])

  // Calcular aspect ratio del frame
  const getFrameStyle = useCallback(() => {
    const { ratio } = CONFIG[platform]
    if (ratio > 1) {
      return { width: '100%', maxWidth: '500px', aspectRatio: `${ratio}` }
    } else if (ratio === 1) {
      return { width: '100%', maxWidth: '360px', aspectRatio: '1' }
    } else {
      return { width: '100%', maxWidth: '280px', aspectRatio: `${ratio}` }
    }
  }, [platform])

  return (
    <main className="resizer-grid">
      {/* Drop Zone */}
      <div
        className={`drop-zone ${isDragging ? 'drag-active' : ''} ${sourcePreview ? 'has-preview' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {sourcePreview ? (
          <img src={sourcePreview} alt="Vista previa" className="source-preview" />
        ) : (
          <div className="drop-content">
            <span className="icon">➕</span>
            <p>Arrastra tu captura técnica aquí</p>
            <small>Soporta JPG · PNG · WebP (Max 10 MB)</small>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="file-input"
        />
      </div>

      {/* Preview + Controls */}
      <div className="preview-container">
        <div className="smartphone-frame" style={getFrameStyle()}>
          <canvas ref={canvasRef} className="main-canvas" />
        </div>

        <div className="controls">
          {/* Platform Selector */}
          <div className="format-selector">
            <label htmlFor="target-format">Destino de Contenido:</label>
            <select
              id="target-format"
              className="select-aura"
              value={platform}
              onChange={(e) => handlePlatformChange(e.target.value as PlatformKey)}
            >
              {Object.entries(CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label} ({key === 'TIKTOK' ? '9:16' : key === 'INSTAGRAM_POST' ? '1:1' : key === 'LINKEDIN_BANNER' ? '1.91:1' : '16:9'})
                </option>
              ))}
            </select>
          </div>

          {/* Download Button */}
          <button
            className="btn-primary"
            disabled={!hasImage || isProcessing}
            onClick={handleDownload}
          >
            Exportar para {CONFIG[platform].label}
          </button>

          {/* Status Log */}
          <div className={`status-log ${statusType}`}>
            {status}
          </div>

          {/* OCR Results */}
          {ocrResult && ocrResult.status !== 'error' && (
            <div className="ocr-panel visible">
              <h3>🔍 Conceptos técnicos detectados</h3>
              <p className="ocr-confidence">
                {ocrResult.status === 'empty'
                  ? 'No se detectó texto en la imagen.'
                  : `Confianza: ${(ocrResult.confidence * 100).toFixed(1)}% · ${ocrResult.words} palabras`}
              </p>
              {ocrResult.concepts.length > 0 && (
                <div className="concepts-list">
                  {ocrResult.concepts.map((concept, i) => (
                    <span key={i} className="concept-tag">{concept}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
