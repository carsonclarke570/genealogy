import type { ReactNode } from "react";

export type ToastViewportPosition =
  | "top"
  | "bottom"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end";

export interface ToastViewportProps {
  /** The live `<Toast>`s to stack. */
  children?: ReactNode;
  /** Where the stack anchors on screen. @default "bottom" */
  position?: ToastViewportPosition;
}

/**
 * ToastViewport — the fixed, app-level region that stacks live `<Toast>`s.
 *
 * Mount one near the app root and render your active toasts inside it; it pins
 * to a screen edge at `--z-toast` and spaces the stack. `Toast` is the visual
 * unit; this is the placement and stacking that the design guide calls for — so
 * you never hand-position a `fixed` wrapper again. Newest toast goes last in
 * the children for a bottom stack, first for a top stack.
 *
 * @example
 * <ToastViewport position="bottom">
 *   {toasts.map((t) => (
 *     <Toast key={t.id} tone={t.tone} title={t.title} onDismiss={() => dismiss(t.id)}>
 *       {t.message}
 *     </Toast>
 *   ))}
 * </ToastViewport>
 */
export function ToastViewport({ children, position = "bottom" }: ToastViewportProps) {
  return (
    <div
      className="fa-toast-viewport"
      data-position={position}
      role="region"
      aria-label="Notifications"
    >
      {children}
    </div>
  );
}
