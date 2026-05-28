import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { pushBackHandler, removeBackHandler } from "../lib/backStack";

/**
 * Portal + body-scroll-lock wrapper for fixed-overlay modals.
 *
 * Two things this fixes versus rendering the modal in-tree:
 *
 *  1. The overlay's stacking context is the document body, not whatever
 *     ancestor div renders the modal. Avoids a class of z-index bugs where
 *     a sibling element (e.g. MobileShell's fixed bottom nav) bleeds through
 *     the modal on certain Chromium builds.
 *
 *  2. Scroll on the underlying page is locked while the modal is open — so
 *     touch-drag inside the modal doesn't accidentally scroll the page
 *     behind it, and re-opening returns to the page's previous position.
 *
 * Keep the wrapped tree as a single overlay element (s.modalOverlay) that
 * handles its own onClick-to-close + inner card. ModalRoot doesn't render
 * any markup of its own.
 *
 * `onClose` (optional): when provided, the modal registers it on the global
 * back stack so the Android hardware/gesture back button closes this modal
 * instead of exiting the app. Pass the SAME function the overlay's
 * onClick-to-close uses. Modals that omit it simply aren't back-dismissable
 * (rare — most should pass it).
 */
export function ModalRoot({ children, onClose }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // Register the close handler on the back stack for the lifetime of the modal.
  // The handler is registered ONCE on mount (stable position in the stack) and
  // calls the latest onClose via a ref — so an inline arrow passed every render
  // doesn't churn the stack order when multiple modals are open.
  const onCloseRef = useRef(onClose);
  // Keep the ref current without writing to it during render (lint:
  // no ref access/mutation in render body).
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    const id = pushBackHandler(() => onCloseRef.current?.());
    return () => removeBackHandler(id);
  }, []);

  return createPortal(children, document.body);
}
