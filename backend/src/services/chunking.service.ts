export interface DocumentChunk {
  chunkIndex: number;
  text: string;
}

export class ChunkingService {
  /**
   * Splits text into smaller chunks based on max length and overlap.
   */
  static chunkText(text: string, maxChunkLength: number = 1000, overlap: number = 200): DocumentChunk[] {
    if (!text || text.trim() === '') return [];

    const chunks: DocumentChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      // Find the end index for this chunk
      let endIndex = startIndex + maxChunkLength;

      // If we are not at the end of the text, try to find a natural break (like a newline or space)
      if (endIndex < text.length) {
        // Try to break at a newline first within the last overlap/2 window
        let breakPoint = text.lastIndexOf('\n', endIndex);
        
        // If no newline, try a space
        if (breakPoint < startIndex + maxChunkLength - overlap) {
          breakPoint = text.lastIndexOf(' ', endIndex);
        }

        // If we found a valid break point that doesn't make the chunk too small, use it
        if (breakPoint > startIndex + maxChunkLength / 2) {
          endIndex = breakPoint;
        }
      }

      const chunkText = text.substring(startIndex, endIndex).trim();
      
      if (chunkText.length > 0) {
        chunks.push({
          chunkIndex,
          text: chunkText,
        });
        chunkIndex++;
      }

      // Calculate next start index using overlap
      startIndex = endIndex - overlap;
      
      // Prevent infinite loops if overlap is misconfigured or text has no spaces
      if (startIndex <= chunks[chunks.length - 1]?.text.length - maxChunkLength + startIndex) {
        startIndex = endIndex; // Force progression if stuck
      }
    }

    return chunks;
  }
}
