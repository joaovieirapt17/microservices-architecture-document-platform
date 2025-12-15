import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  bigint,
  index,
} from 'drizzle-orm/pg-core';

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    uploadedBy: uuid('uploaded_by').notNull(),

    // File metadata
    fileName: varchar('file_name', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),

    // MinIO
    bucketName: varchar('bucket_name', { length: 100 }).notNull(),
    objectKey: varchar('object_key', { length: 500 }).notNull(),

    description: text('description'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('org_idx').on(table.organizationId)],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
