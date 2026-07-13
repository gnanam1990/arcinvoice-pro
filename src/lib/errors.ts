export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code?: "VALIDATION" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INVALID_STATE" | "UNAVAILABLE";
      fieldErrors?: Record<string, string[]>;
    };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(
  error: string,
  code: NonNullable<Extract<ActionResult, { ok: false }>["code"]> = "VALIDATION",
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, code, fieldErrors };
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "VALIDATION"
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "CONFLICT"
      | "INVALID_STATE"
      | "UNAVAILABLE" = "VALIDATION",
  ) {
    super(message);
    this.name = "AppError";
  }
}
