import { useEffect, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { useAppStore } from '../../state/useAppStore'

/**
 * A quick scratchpad in the top bar. Opens a small popover with a textarea whose
 * content auto-saves (debounced) to `settings.notes` — no manual save, persisted
 * across sessions and synced to other windows via `settings:changed`.
 */
export function NotesButton() {
  const notes = useAppStore((s) => s.settings?.notes ?? '')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(notes)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // True while the user is mid-edit, so an incoming settings broadcast (e.g. from
  // another window) doesn't clobber what they're typing here.
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setDraft(notes)
  }, [notes])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const onChange = (text: string): void => {
    editing.current = true
    setDraft(text)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      editing.current = false
      void window.dockterm.invoke('settings:set', { notes: text })
    }, 350)
  }

  return (
    <div className="notes">
      <button
        className={`iconbtn tip--end${open ? ' iconbtn--active' : ''}`}
        data-tip="Notes"
        aria-label="Notes"
        onClick={() => setOpen((o) => !o)}
      >
        <StickyNote size={15} />
      </button>
      {open && (
        <>
          <div className="notes__scrim" onClick={() => setOpen(false)} />
          <div className="notes__pop">
            <div className="notes__head">
              <span className="notes__title">Notes</span>
              <span className="notes__hint">auto-saved</span>
            </div>
            <textarea
              className="notes__area"
              value={draft}
              placeholder="Jot anything down — it saves automatically."
              spellCheck={false}
              autoFocus
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  )
}
