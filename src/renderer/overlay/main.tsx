import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MunuFace } from '@renderer/components/munu/MunuFace'
import type { MunuGlobal, MunuState } from '@shared/types'
import { playAsk, playDone } from './sounds'
import './overlay.css'

const LABEL: Record<MunuState, string> = {
  idle: 'resting',
  working: 'working…',
  asking: 'needs you',
  done: 'done'
}

const setInteractive = (v: boolean): void => {
  void window.dockterm.invoke('munu:setInteractive', { interactive: v })
}
const answer = (key: 'enter' | 'esc'): void => {
  void window.dockterm.invoke('munu:answer', { key })
}
const focus = (): void => {
  void window.dockterm.invoke('munu:focus', undefined)
}

function Overlay() {
  const [g, setG] = useState<MunuGlobal>({ state: 'idle', asks: [] })
  const [sounds, setSounds] = useState(true)
  const [platform, setPlatform] = useState('')
  const prev = useRef<MunuState>('idle')

  useEffect(() => window.dockterm.on('munu:state', setG), [])

  useEffect(() => {
    void window.dockterm.invoke('settings:get', undefined).then((r) => {
      if (r.ok) setSounds(r.value.munu.sounds)
    })
    void window.dockterm.invoke('app:getInfo', undefined).then((r) => {
      if (r.ok) setPlatform(r.value.platform)
    })
    return window.dockterm.on('settings:changed', (s) => setSounds(s.munu.sounds))
  }, [])

  // Play a cue on entering asking / done.
  useEffect(() => {
    if (g.state !== prev.current) {
      if (sounds && g.state === 'asking') playAsk()
      if (sounds && g.state === 'done') playDone()
      prev.current = g.state
    }
  }, [g.state, sounds])

  const asking = g.state === 'asking'
  const ask = g.asks[0]

  return (
    <div className={`ov ov--${platform}`}>
      <div
        className={`island island--${g.state}${asking ? ' island--open' : ''}`}
        onMouseEnter={() => setInteractive(true)}
        onMouseLeave={() => setInteractive(false)}
        onClick={() => !asking && focus()}
        title="munu"
      >
        <div className="island__row">
          <MunuFace state={g.state} size={26} />
          <span className="island__label">{LABEL[g.state]}</span>
        </div>
        {asking && (
          <div className="island__card">
            {ask?.command && <pre className="island__cmd">{ask.command}</pre>}
            <div className="island__actions">
              <button
                className="ob ob--yes"
                onClick={(e) => {
                  e.stopPropagation()
                  answer('enter')
                }}
              >
                [y] yes
              </button>
              <button
                className="ob ob--no"
                onClick={(e) => {
                  e.stopPropagation()
                  answer('esc')
                }}
              >
                [n] no
              </button>
              <button
                className="ob"
                onClick={(e) => {
                  e.stopPropagation()
                  focus()
                }}
              >
                open
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const container = document.getElementById('overlay-root')
if (container) createRoot(container).render(<Overlay />)
