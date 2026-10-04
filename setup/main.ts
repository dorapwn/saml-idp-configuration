import { defineAppSetup } from '@slidev/types'

/**
 * Hide the Goto dialog's autocomplete dropdown until the user actually
 * types something. By default, Slidev's <Goto /> shows all 68 slides
 * in the dropdown the moment `g` is pressed, because Fuse.js with an
 * empty query returns the entire corpus sorted by threshold.
 *
 * This setup watches for the dialog and its input, and toggles a
 * `goto-has-query` class on the dialog based on input emptiness.
 * style.css pairs with this by hiding .autocomplete-list unless
 * the dialog carries that class.
 */
export default defineAppSetup(() => {
  if (typeof window === 'undefined') return

  // Poll once after every microtask; cheaper than MutationObserver,
  // and the input element is the only thing we care about.
  const sync = () => {
    const dialog = document.getElementById('slidev-goto-dialog')
    const input = document.getElementById('slidev-goto-input') as HTMLInputElement | null
    if (!dialog || !input) return

    const hasQuery = input.value.length > 0
    dialog.classList.toggle('goto-has-query', hasQuery)
  }

  // Run on every meaningful user event in the dialog area.
  // We delegate from document because the input lives inside an
  // overlay that may be remounted each time the dialog opens.
  const handler = (e: Event) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    if (target.id === 'slidev-goto-input') sync()
  }
  document.addEventListener('input', handler, true)
  document.addEventListener('keyup', handler, true)

  // Also re-sync when the dialog slides in (visibility change on dialog).
  const dialogObserver = new MutationObserver(sync)
  const startObservingDialog = () => {
    const dialog = document.getElementById('slidev-goto-dialog')
    if (dialog) dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['class'] })
  }
  // The dialog may not exist yet at app boot. Try now and on next tick.
  startObservingDialog()
  setTimeout(startObservingDialog, 100)
  setTimeout(startObservingDialog, 500)
})