import type { ConfigService } from '@nestjs/config';
import type { MongooseModuleOptions } from '@nestjs/mongoose';

export function buildMongoConnectionOptions(configService: ConfigService): MongooseModuleOptions {
  const mongodbEnabled = configService.get<boolean>('MONGODB_ENABLED', true);
  
  if (!mongodbEnabled) {
    // Return a dummy configuration when MongoDB is disabled
    // This prevents connection attempts
    return {
      uri: 'mongodb://localhost:27017/disabled',
      autoCreate: false,
      autoIndex: false,
    };
  }

  return {
    uri: configService.getOrThrow<string>('MONGODB_URI'),
    dbName: configService.get<string>('MONGODB_DB_NAME'),
    autoIndex: true,
  };
}
