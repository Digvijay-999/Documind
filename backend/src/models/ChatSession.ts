import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface IChatSession extends Document {
  userId: string;
  documentId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * EMBEDDING: Message Subdocument Schema
 * Messages are embedded directly inside ChatSession because they are tightly coupled
 * and always retrieved together with the session.
 */
const messageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

/**
 * MongoDB ChatSession Schema demonstrating EMBEDDING vs REFERENCING:
 * - REFERENCING: `userId` and `documentId` reference authoritative PostgreSQL entities by UUID.
 * - EMBEDDING: `messages` array contains embedded message subdocuments.
 */
const chatSessionSchema = new Schema<IChatSession>(
  {
    // REFERENCING: Foreign identifier references to PostgreSQL
    userId: { type: String, required: true, ref: 'User' },
    documentId: { type: String, required: true, ref: 'Document' },
    // EMBEDDING: Embedded subdocuments for conversation history
    messages: { type: [messageSchema], default: [] },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Indexes
// Compound index to fetch chats for a specific document and user quickly
chatSessionSchema.index({ userId: 1, documentId: 1 });
// Index to sort the chat sessions by last updated
chatSessionSchema.index({ updatedAt: -1 });

export const ChatSession = mongoose.model<IChatSession>('ChatSession', chatSessionSchema);
