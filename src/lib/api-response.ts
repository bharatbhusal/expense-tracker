import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors";
import { SERVER_ERRORS, VALIDATION_ERRORS } from "@/constants/error-messages";
import ERROR_NAMES from "@/constants/error-names";

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: VALIDATION_ERRORS.GENERIC,
          code: ERROR_NAMES.VALIDATION_ERROR,
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      { status: error.statusCode },
    );
  }

  const message = error instanceof Error ? error.message : SERVER_ERRORS.INTERNAL_ERROR;
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    { status: 500 },
  );
}
