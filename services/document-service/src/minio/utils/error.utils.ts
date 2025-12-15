export interface MinioError {
  code: string;
}

export function isMinioError(error: unknown): error is MinioError {
  return typeof error === 'object' && error !== null && 'code' in error;
}
