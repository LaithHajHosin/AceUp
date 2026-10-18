import { Global, Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';

const logger = new Logger('DatabaseModule');

// Fail fast on queries if MongoDB is disconnected rather than hanging for 10s
mongoose.set('bufferCommands', false);

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri =
          process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preppressure';
        return {
          uri,
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 2000,
          lazyConnection: true,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              logger.log('Connected to MongoDB database.');
            });
            connection.on('error', (err: Error) => {
              logger.warn(
                `MongoDB connection unavailable (${err.message}). Using synchronized fallback store until MongoDB is reachable.`,
              );
            });
            // Trigger background connection attempt without blocking NestJS bootstrap
            connection.openUri(uri).catch(() => {
              // Handled by 'error' listener above
            });
            return connection;
          },
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
