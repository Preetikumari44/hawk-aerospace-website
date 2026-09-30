import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class QuotaErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QuotaErrorInterceptor.name);
  private readonly useMongoDb: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useMongoDb = this.configService.get<string>('DATABASE_SOURCE') === 'mongodb';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Check if this is a Firestore quota error
        if (this.isQuotaError(error)) {
          // If MongoDB is primary database, log the error but don't block the request
          if (this.useMongoDb) {
            this.logger.warn(
              'Firestore quota error detected, but MongoDB is primary database. ' +
              'The service should be updated to use MongoDB instead of Firestore.',
            );
            this.logger.warn(`Error details: ${error.message}`);
            
            // Return a more helpful error message
            return throwError(() => 
              new HttpException(
                {
                  statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                  message: 'This endpoint is still using Firestore which has exceeded quota. ' +
                           'Please contact support to migrate this endpoint to MongoDB.',
                  error: 'Service Migration Required',
                  hint: 'Set DATABASE_SOURCE=mongodb in .env and update the service to query MongoDB',
                },
                HttpStatus.SERVICE_UNAVAILABLE,
              )
            );
          }

          // If Firestore is primary, return quota error as before
          return throwError(() => 
            new HttpException(
              {
                statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                message: 'Database quota exceeded. Please try again later or contact support.',
                error: 'Quota Exceeded',
                retryAfter: this.getRetryAfterSeconds(),
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            )
          );
        }

        // Re-throw other errors as-is
        return throwError(() => error);
      }),
    );
  }

  private isQuotaError(error: any): boolean {
    const errorMessage = error?.message || '';
    const errorCode = error?.code;

    // Check for Firestore quota error patterns
    return (
      errorCode === 8 || // RESOURCE_EXHAUSTED
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      errorMessage.includes('Quota limit exceeded') ||
      errorMessage.includes('quota metric')
    );
  }

  private getRetryAfterSeconds(): number {
    // Calculate seconds until next day (midnight Pacific Time)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(8, 0, 0, 0); // Midnight PT = 8:00 UTC next day
    
    if (tomorrow <= now) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
  }
}
