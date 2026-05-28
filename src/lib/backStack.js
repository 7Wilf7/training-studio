// Tiny global "dismiss stack" for the Android hardware/gesture back button.
//
// Every modal (anything rendered through ModalRoot with an onClose) pushes its
// close handler here on mount and removes it on unmount. The back-button
// listener in AppShell pops the TOP handler first, so back closes the
// most-recently-opened overlay — matching what the user expects ("back undoes
// the last thing I opened") without each modal needing to know about the
// hardware back button.
//
// Why a module-level stack instead of React context: the @capacitor/app
// backButton listener is registered once and lives outside React's render
// tree. A plain mutable stack it can read synchronously is simpler and avoids
// stale-closure bugs from capturing React state in the listener.

let stack = [];
let counter = 0;

// Register a close handler. Returns an id used to remove it again.
export function pushBackHandler(onClose) {
  const id = ++counter;
  stack.push({ id, onClose });
  return id;
}

// Remove a previously-registered handler (on modal unmount). Safe to call with
// an id that's already gone.
export function removeBackHandler(id) {
  stack = stack.filter(e => e.id !== id);
}

// True when at least one dismissable overlay is open.
export function hasBackHandler() {
  return stack.length > 0;
}

// Pop + invoke the top handler. Returns true if one was handled, false if the
// stack was empty (caller then falls through to tab-nav / minimize).
export function popBackHandler() {
  const top = stack[stack.length - 1];
  if (!top) return false;
  // Remove first so a handler that itself unmounts (calling removeBackHandler)
  // doesn't double-fire.
  stack = stack.filter(e => e.id !== top.id);
  try {
    top.onClose();
  } catch {
    /* a modal's onClose throwing shouldn't wedge the back button */
  }
  return true;
}
