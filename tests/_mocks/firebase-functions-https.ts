export class HttpsError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}
export const onCall = (_opts: unknown, fn: any) => fn
export default { HttpsError, onCall }
