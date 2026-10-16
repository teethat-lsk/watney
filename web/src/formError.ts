import { ClientResponseError } from 'pocketbase'

/** A save the backend rejected, with a validation code for each rejected field (e.g. `validation_not_unique`). */
export class FormError extends Error {
  readonly fields: Record<string, string>

  constructor(fields: Record<string, string>) {
    super(`Rejected fields: ${Object.keys(fields).join(', ')}`)
    this.fields = fields
  }
}

/** Turns PocketBase's field validation response into a FormError; other errors pass through. */
export function toFormError(error: unknown): unknown {
  if (!(error instanceof ClientResponseError) || error.status !== 400) return error
  const data: Record<string, { code?: string }> = error.response?.data ?? {}
  const fields = Object.fromEntries(Object.entries(data).map(([field, detail]) => [field, detail.code ?? 'invalid']))
  return Object.keys(fields).length > 0 ? new FormError(fields) : error
}

/** Messages for the validation codes a form expects, by field then code. */
export type FieldMessages = Record<string, Record<string, string>>

/** The message to show for a failed save: the first expected field error, or a general one. */
export function saveErrorMessage(error: unknown, messages: FieldMessages): string {
  if (!(error instanceof FormError)) return 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
  for (const [field, code] of Object.entries(error.fields)) {
    const message = messages[field]?.[code]
    if (message) return message
  }
  return 'ข้อมูลไม่ถูกต้อง ตรวจสอบแล้วลองใหม่อีกครั้ง'
}
