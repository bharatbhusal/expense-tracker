import type { ApiRequestOptions, ApiResponse } from "@/constants/types/api.types";

class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

function getPath(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }

  return path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
}

function isRawBody(body: unknown): body is FormData | Blob | ArrayBuffer {
  return body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer;
}

function toRequestBody(body: unknown, hasBody: boolean): BodyInit | undefined {
  if (!hasBody) {
    return undefined;
  }

  if (isRawBody(body)) {
    return body;
  }

  return JSON.stringify(body);
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  const body = hasBody ? options.body : undefined;
  const rawBody = isRawBody(body);

  const response = await fetch(getPath(path), {
    ...options,
    credentials: "include",
    headers: {
      ...(rawBody ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {}),
    },
    body: toRequestBody(body, hasBody),
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    const message = payload.success ? "Request failed" : payload.error.message;
    const code = payload.success ? undefined : payload.error.code;
    throw new ApiClientError(message, response.status, code);
  }

  return payload.data;
}

export { ApiClientError };
