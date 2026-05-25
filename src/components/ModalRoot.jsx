import { useEffect } from "react";
import { createPortal } from "react-dom";

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
 */
export function ModalRoot({ children }) {
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

  return createPortal(children, document.body);
}
