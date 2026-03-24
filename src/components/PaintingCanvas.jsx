import { useRef, useState, useCallback } from 'react'

export default function PaintingCanvas({ onColorPick, onImageLoad, onCanvasReady }) {
  const canvasRef = useRef(null)
  const hiddenRef = useRef(null)
  const inputRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  const loadImage = useCallback(async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WEBP).')
      return
    }
    setError(null)
    try {
      const bitmap = await createImageBitmap(file)

      hiddenRef.current.width = bitmap.width
      hiddenRef.current.height = bitmap.height
      hiddenRef.current.getContext('2d').drawImage(bitmap, 0, 0)

      const canvas = canvasRef.current
      const parentW = canvas.parentElement?.clientWidth || 800
      const maxW = parentW - 40
      const maxH = window.innerHeight - 120
      const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1)

      canvas.width  = Math.max(1, Math.round(bitmap.width  * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()

      setLoaded(true)
      onImageLoad?.()
      onCanvasReady?.(canvas)   // pass display canvas up to App
    } catch (err) {
      if (file.name.toLowerCase().match(/\.heic?$/)) {
        setError("HEIC files aren't supported. Export as JPEG or PNG from Photos app first.")
      } else {
        setError(`Couldn't load image: ${err.message}. Try PNG or JPEG.`)
      }
    }
  }, [onImageLoad, onCanvasReady])

  const handleMouseMove = useCallback((e) => {
    if (!loaded) return
    const canvas = canvasRef.current
    const hidden = hiddenRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = hidden.width / canvas.width
    const scaleY = hidden.height / canvas.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top)  * scaleY)
    const [r, g, b] = hidden.getContext('2d').getImageData(x, y, 1, 1).data
    onColorPick?.({ r, g, b })
  }, [loaded, onColorPick])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    loadImage(e.dataTransfer.files[0])
  }, [loadImage])

  const handleFileInput = (e) => loadImage(e.target.files[0])

  return (
    <div
      className={`canvas-wrapper ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <canvas ref={hiddenRef} style={{ display: 'none' }} />

      {!loaded && (
        <div className="upload-center">
          <div className="upload-area" onClick={() => inputRef.current.click()}>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            <div className="upload-icon">🎨</div>
            <p>拖入你的画，或者点击上传</p>
            <span>JPG · PNG · WEBP &nbsp;（iPhone 请先导出为 JPEG）</span>
          </div>
          {error && <p className="upload-error">{error}</p>}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="painting-canvas"
        style={{ display: loaded ? 'block' : 'none', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
      />
    </div>
  )
}
