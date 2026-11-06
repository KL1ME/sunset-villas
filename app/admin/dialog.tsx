"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function AdminDialog({
  title,
  busy = false,
  onClose,
  children,
}: {
  title: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-modal"
      aria-labelledby={id}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <button
        type="button"
        className="dialog-close icon-button"
        aria-label="Κλείσιμο"
        disabled={busy}
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <h2 id={id}>{title}</h2>
      {children}
    </dialog>
  );
}
