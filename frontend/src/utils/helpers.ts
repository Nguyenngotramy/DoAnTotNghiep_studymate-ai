import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

export const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

export const formatDate = (date: string) =>
  format(new Date(date), 'dd/MM/yyyy', { locale: vi })

export const timeAgo = (date: string) =>
  formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi })

export const formatFileSize = (kb: number) =>
  kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
