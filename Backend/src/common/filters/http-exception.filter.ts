import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    
    // Get ConfigService to check environment
    let isProduction = false;
    try {
      const app = request.app as any;
      const configService = app.get ? app.get(ConfigService) : null;
      if (configService) {
        isProduction = configService.get('NODE_ENV') === 'production';
      } else {
        isProduction = process.env.NODE_ENV === 'production';
      }
    } catch {
      // If ConfigService is not available, assume production for safety
      isProduction = process.env.NODE_ENV === 'production';
    }

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const detailedMessage =
      typeof rawResponse === 'string'
        ? rawResponse
        : ((rawResponse as Record<string, unknown>).message ?? 'Internal server error');

    // ALWAYS log full details for server-side debugging
    if (!(exception instanceof HttpException) || status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} failed with status ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // ✅ SECURITY FIX: Hide internal details in production for 5xx errors
    const clientMessage = isProduction && status >= 500
      ? 'An internal server error occurred. Please try again later. If the problem persists, contact support.'
      : detailedMessage;

    // Build response object
    const errorResponse: any = {
      success: false,
      error: clientMessage,
      timestamp: new Date().toISOString(),
    };

    // Only include diagnostic info in development
    if (!isProduction) {
      errorResponse.path = request.originalUrl;
      errorResponse.statusCode = status;
    }

    response.status(status).json(errorResponse);
  }
}
