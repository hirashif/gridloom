import { toast as sonnerToast } from 'sonner'

export function toast(text: string) {
  sonnerToast(text)
}

export function toastError(text: string) {
  sonnerToast.error(text)
}
