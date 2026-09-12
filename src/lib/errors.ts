import ERROR_NAMES from "@/constants/error-names";

export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(message: string, statusCode = 500, code?: string, details?: unknown) {
    super(message);
    this.name = ERROR_NAMES.APP_ERROR;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
