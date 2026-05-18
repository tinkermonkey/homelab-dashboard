import React from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import './ConfirmDialog.css'

export type ConfirmDialogVariant = 'primary' | 'danger'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmDialogVariant
}

export const ConfirmDialog = React.forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
      isOpen,
      onClose,
      onConfirm,
      title,
      message,
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      variant = 'danger',
    },
    ref
  ) => {
    const handleConfirm = () => {
      onConfirm()
      onClose()
    }

    return (
      <Modal
        ref={ref}
        isOpen={isOpen}
        onClose={onClose}
        title={title}
      >
        <div className="confirm-dialog__message">{message}</div>
        <div className="confirm-dialog__footer">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            size="sm"
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    )
  }
)

ConfirmDialog.displayName = 'ConfirmDialog'

export default ConfirmDialog
