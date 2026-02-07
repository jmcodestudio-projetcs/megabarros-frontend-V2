type ConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6">
        <h3 className="text-lg font-semibold text-brand-dark">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-70"
            disabled={loading}
          >
            {loading ? "Excluindo..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}