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

const messageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const chatSessionSchema = new Schema<IChatSession>(
  {
    userId: { type: String, required: true },
    documentId: { type: String, required: true },
    messages: { type: [messageSchema], default: [] },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Indexes
// To fetch chats for a specific document and user quickly
chatSessionSchema.index({ userId: 1, documentId: 1 });
// To sort the chat sessions by last updated
chatSessionSchema.index({ updatedAt: -1 });

export const ChatSession = mongoose.model<IChatSession>('ChatSession', chatSessionSchema);
