import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

export const drizzleProvider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const host = configService.getOrThrow<string>('DB_HOST');
    const port = configService.getOrThrow<number>('DB_PORT');
    const user = configService.getOrThrow<string>('DB_USER');
    const password = configService.getOrThrow<string>('DB_PASSWORD');
    const dbName = configService.getOrThrow<string>('DB_NAME');
    const sslEnabled = configService.get<string>('DB_SSL') === 'true';

    const connectionString = `postgres://${user}:${password}@${host}:${port}/${dbName}${sslEnabled ? '?sslmode=require' : ''}`;

    const client = postgres(connectionString, {
      max: 10,
      ssl: sslEnabled ? 'require' : false,
    });

    return drizzle(client, { schema });
  },
};

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;
