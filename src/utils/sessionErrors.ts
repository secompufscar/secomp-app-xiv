export class InvalidSessionError extends Error {}

export function isInvalidSessionError(error: unknown): boolean {
  if (error instanceof InvalidSessionError) return true;
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 401;
}
