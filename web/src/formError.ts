import { ClientResponseError } from 'pocketbase'

/** A save the backend rejected, with a validation code for each rejected field (e.g. `validation_not_unique`). */
export class FormError extends Error {
  readonly fields: Record<string, string>

  constructor(fields: Record<string, string>) {
    super(`Rejected fields: ${Object.keys(fields).join(', ')}`)
    this.fields = fields
  }
}

type FieldErrors = Record<string, { code?: string }>

/**
 * Turns PocketBase's field validation response into a FormError; other errors pass through.
 * A failed batch request reports the field errors of each request that failed; they're merged.
 */
export function toFormError(error: unknown): unknown {
  if (!(error instanceof ClientResponseError) || error.status !== 400) return error
  const data = error.response?.data ?? {}
  const batch: Record<string, { response?: { data?: FieldErrors } }> | undefined = data.requests
  const errors: FieldErrors = batch
    ? Object.assign({}, ...Object.values(batch).map((request) => request.response?.data ?? {}))
    : data
  const fields = Object.fromEntries(Object.entries(errors).map(([field, detail]) => [field, detail.code ?? 'invalid']))
  return Object.keys(fields).length > 0 ? new FormError(fields) : error
}

/** Waits for a save, turning the backend's field validation errors into a FormError. */
export async function withFormErrors<T>(save: Promise<T>): Promise<T> {
  try {
    return await save
  } catch (error) {
    throw toFormError(error)
  }
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
