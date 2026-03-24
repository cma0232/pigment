import { useState, useCallback } from 'react'
import PaintingCanvas from './components/PaintingCanvas'
import PigmentPanel from './components/PigmentPanel'
import FlowCanvas from './components/FlowCanvas'
import './App.css'

export default function App() {
  const [color, setColor] = useState(null)
  const [paintingCanvas, setPaintingCanvas] = useState(null)
  const [mode, setMode] = useState('pick')   // 'pick' | 'flow'

  const handleCanvasReady = useCallback((canvas) => {
    setPaintingCanvas(canvas)
  }, [])

  const loaded = !!paintingCanvas

  return (
    <div className="app">
      <header className="app-header">
        <h1>Pigment</h1>
        <p>
          {!loaded && 'Upload a painting to analyze its colors'}
          {loaded && mode === 'pick' && 'Hover over the painting to see pigment matches'}
          {loaded && mode === 'flow' && 'Move the mouse to disturb the particle flow'}
        </p>
        {loaded && (
          <button
            className={`mode-btn ${mode === 'flow' ? 'active' : ''}`}
            onClick={() => setMode(m => m === 'pick' ? 'flow' : 'pick')}
          >
            {mode === 'pick' ? '✦  Animate' : '✦  Color Pick'}
          </button>
        )}
      </header>

      <main className="app-body">
        <div className="canvas-area">
          {/* color pick mode */}
          <div style={{ display: mode === 'pick' ? 'flex' : 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <PaintingCanvas
              onColorPick={setColor}
              onCanvasReady={handleCanvasReady}
            />
          </div>

          {/* flow animation mode */}
          {mode === 'flow' && paintingCanvas && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <FlowCanvas sourceCanvas={paintingCanvas} />
            </div>
          )}
        </div>

        {mode === 'pick' && (
          <aside className="panel-area">
            <PigmentPanel color={color} />
          </aside>
        )}
      </main>
    </div>
  )
}
