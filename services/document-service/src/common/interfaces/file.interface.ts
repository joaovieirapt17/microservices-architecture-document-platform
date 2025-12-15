import { Readable } from 'stream';

export interface IncomingFile {
  filename: string;
  mimetype: string;
  file: Readable;
}
