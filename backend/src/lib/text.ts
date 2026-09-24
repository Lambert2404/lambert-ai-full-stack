import { detectFileType } from './util.js';
import { ValidationError } from './errors.js';

export interface ExtractedText {
  text: string;
  pages?: number;
}

/**
 * Extract plain text from an uploaded file buffer.
 * Supported: PDF, DOCX, TXT. Anything else is rejected before we get here.
 */
export async function extractText(buffer: Buffer, fileName: string): Promise<ExtractedText> {
  const fileType = detectFileType(fileName);
  if (!fileType) {
    throw new ValidationError('Unsupported file type. Upload PDF, DOCX or TXT files.');
  }

  try {
    switch (fileType) {
      case 'pdf': {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        try {
          const result = await parser.getText();
          return { text: (result.text ?? '').trim(), pages: result.total };
        } finally {
          await parser.destroy();
        }
      }
      case 'docx': {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return { text: (result.value ?? '').trim() };
      }
      case 'txt': {
        return { text: buffer.toString('utf8').replace(/^\uFEFF/, '').trim() };
      }
    }
  } catch {
    throw new ValidationError(
      'Could not extract text from this file. The file may be corrupted or password-protected.'
    );
  }
  throw new ValidationError('Unsupported file type. Upload PDF, DOCX or TXT files.');
}