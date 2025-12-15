import { IncomingFile } from 'src/common/interfaces/file.interface';

export interface UploadDocumentParams {
  file: IncomingFile;
  fileSize: number;
  description?: string;
}
