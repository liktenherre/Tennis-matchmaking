// Normalizes thrown values (Error, PostgrestError plain objects) into user-facing text.

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message.trim()
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
};
