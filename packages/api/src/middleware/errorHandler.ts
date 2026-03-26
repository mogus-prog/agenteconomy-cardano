import type {
  FastifyRequest,
  FastifyReply,
  FastifyError,
} from "fastify";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class PolicyViolationError extends AppError {
  constructor(message: string) {
    super(message, 403, "POLICY_VIOLATION");
  }
}

export class ChainError extends AppError {
  constructor(message: string, public readonly txHash?: string) {
    super(message, 502, "CHAIN_ERROR");
  }
}

export class RateLimitError extends AppError {
  constructor(public readonly retryAfter: number = 60) {
    super("Rate limit exceeded", 429, "RATE_LIMIT");
  }
}

interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export function errorHandler(
  err: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: err.name,
      code: err.code,
      message: err.message,
    };
    if (err instanceof ValidationError && err.fields) {
      response.fields = err.fields;
    }
    if (err instanceof RateLimitError) {
      void reply.header("Retry-After", String(err.retryAfter));
    }

    if (err.statusCode >= 500) {
      request.log.error({ err }, "Server error");
    }

    void reply.code(err.statusCode).send(response);
    return;
  }

  // Fastify validation errors
  const fe = err as FastifyError;
  if (fe.statusCode && fe.statusCode < 500) {
    void reply.code(fe.statusCode).send({
      error: "RequestError",
      code: "REQUEST_ERROR",
      message: fe.message,
    });
    return;
  }

  // Unknown errors — never leak details
  request.log.error({ err }, "Unhandled error");
  void reply.code(500).send({
    error: "InternalError",
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  });
}

export default async function errorHandlerPlugin(fastify: import("fastify").FastifyInstance): Promise<void> {
  fastify.setErrorHandler(errorHandler);

  fastify.setNotFoundHandler((request, reply) => {
    void reply.code(404).send({
      error: "NotFound",
      code: "NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}
