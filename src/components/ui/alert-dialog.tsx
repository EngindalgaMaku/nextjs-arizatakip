import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogProps,
  DialogTitle,
  DialogDescription,
  DialogContent,
} from 'tamagui'
import { Button, View } from 'tamagui'

export interface AlertDialogProps extends DialogProps {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  isLoading?: boolean
  isOpen: boolean
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <View marginBottom="$2">{children}</View>
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <View marginTop="$4" flexDirection="row" gap="$2">{children}</View>
}

export function DialogCancel(props: React.ComponentProps<typeof Button>) {
  return <Button chromeless {...props} />
}

export function DialogAction(props: React.ComponentProps<typeof Button>) {
  return <Button theme="active" {...props} />
}

export function AlertDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isLoading,
  isOpen,
  ...rest
}: AlertDialogProps) {
  const { t } = useTranslation()

  function handleCancel() {
    if (onCancel) onCancel()
  }

  function handleConfirm() {
    if (isLoading) return
    onConfirm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel} {...rest}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(title)}</DialogTitle>
        </DialogHeader>
        {description && <DialogDescription>{t(description)}</DialogDescription>}
        <DialogFooter>
          <DialogCancel onPress={handleCancel}>
            {cancelLabel ? t(cancelLabel) : t('common:cancel')}
          </DialogCancel>
          <DialogAction onPress={handleConfirm} disabled={isLoading}>
            {confirmLabel ? t(confirmLabel) : t('common:confirm')}
          </DialogAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export {
  Dialog as AlertDialogRoot,
  DialogAction as AlertDialogAction,
  DialogCancel as AlertDialogCancel,
  DialogContent as AlertDialogContent,
  DialogDescription as AlertDialogDescription,
  DialogFooter as AlertDialogFooter,
  DialogHeader as AlertDialogHeader,
  DialogTitle as AlertDialogTitle,
} 