export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function err(code: string, message: string): {
  ok: false;
  error: { code: string; message: string };
} {
  return { ok: false, error: { code, message } };
}
