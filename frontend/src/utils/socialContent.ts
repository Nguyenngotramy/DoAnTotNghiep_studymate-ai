export function tagValue(tag: unknown): string {
  if (tag == null) return ''
  const source = typeof tag === 'object'
    ? ((tag as Record<string, unknown>).name
      ?? (tag as Record<string, unknown>).label
      ?? (tag as Record<string, unknown>).tag
      ?? (tag as Record<string, unknown>).value)
    : tag
  if (source == null) return ''
  const value = String(source).trim().replace(/^#+/, '').trim()
  return value && !/^#+$/.test(value) ? value : ''
}

export function normalizeTag(tag: unknown): string {
  const value = tagValue(tag)
  return value ? `#${value}` : ''
}

export function visibleTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of tags) {
    const normalized = normalizeTag(item)
    const key = normalized.toLocaleLowerCase('vi')
    if (!normalized || seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }
  return result
}

export function tagValues(tags: unknown): string[] {
  return visibleTags(tags).map(tag => tag.slice(1))
}

export function socialCommentId(comment: any): string {
  const raw = comment?.id ?? comment?._id ?? comment?.commentId
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (raw.$oid) return String(raw.$oid)
  return String(raw)
}

export function dedupeComments<T = any>(items: unknown): T[] {
  if (!Array.isArray(items)) return []
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    if (!item) continue
    const id = socialCommentId(item)
    const fallback = [item.authorId, item.createdAt, item.content, item.parentId].map(value => String(value ?? '')).join('|')
    const key = id ? `id:${id}` : `fallback:${fallback}`
    if (!fallback.replace(/\|/g, '').trim() || seen.has(key)) continue
    seen.add(key)
    result.push({
      ...item,
      ...(id ? { id } : {}),
      replies: Array.isArray(item.replies) ? dedupeComments(item.replies) : item.replies,
    } as T)
  }
  return result
}
