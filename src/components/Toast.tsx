import type { ReactNode } from "react";

export type ToastTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface ToastProps {
  /** Semantic tone — sets the icon colour. @default "neutral" */
  tone?: ToastTone;
  /** Short bold headline. */
  title?: ReactNode;
  /** The message body. */
  children?: ReactNode;
  /** Show a dismiss button wired to this handler. */
  onDismiss?: () => void;
  /** Override the default tone icon. */
  icon?: ReactNode;
}

const ToneIcon = ({ tone }: { tone: ToastTone }) => {
  if (tone === "success")
    return (<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" /><path d="M6.5 10.5l2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);
  if (tone === "warning" || tone === "danger")
    return (<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" /><path d="M10 5.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="14" r="1" fill="currentColor" /></svg>);
  return (<svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" /><path d="M10 9.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="10" cy="6.5" r="1" fill="currentColor" /></svg>);
};

/**
 * Toast — transient feedback for an action (saved, uploaded, deleted, failed).
 *
 * The visual unit only; an app-level viewport stacks and times these (position
 * with `--z-toast`). `danger`/`warning` use `role="alert"`; others `role="status"`.
 * Pairs with Dialog for confirm-then-confirm flows.
 *
 * @example
 * <Toast tone="success" title="Saved" onDismiss={dismiss}>Eleanor’s record was updated.</Toast>
 * <Toast tone="danger" title="Upload failed">The file was larger than 25 MB.</Toast>
 */
export function Toast({ tone = "neutral", title, children, onDismiss, icon }: ToastProps) {
  const assertive = tone === "danger" || tone === "warning";
  return (
    <div
      className={`fa-toast fa-toast--${tone}`}
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
    >
      <span className="fa-toast__icon">{icon ?? <ToneIcon tone={tone} />}</span>
      <div className="fa-toast__body">
        {title && <span className="fa-toast__title">{title}</span>}
        {children && <span className="fa-toast__msg">{children}</span>}
      </div>
      {onDismiss && (
        <button type="button" className="fa-toast__dismiss" aria-label="Dismiss" onClick={onDismiss}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      )}
    </div>
  );
}
