import { Readable } from 'stream';

export interface UploadResult {
  bucket: string;
  key: string;
  etag: string;
  url?: string;
}

export interface UploadFileParams {
  objectKey: string;
  stream: Readable;
  size: number;
  mimeType: string;
}

export interface GetPresignedUrlParams {
  objectKey: string;
  expirySeconds?: number;
}

export interface FileStatsResult {
  size: number;
  etag: string;
  lastModified: Date;
  contentType: string;
}
