import { Mock, vi } from "vitest";

import { Message } from "discord.js";

export type MockMessage = Omit<Message, 'reply' | 'suppressEmbeds'> & {
  reply: Mock;
  suppressEmbeds: Mock;
};

export const createMessage = (content: string): MockMessage => ({
  content,
  author: { username: "Roy" },
  reply: vi.fn(),
  suppressEmbeds: vi.fn().mockResolvedValue({}),
} as unknown as MockMessage); // Force cast to our helper type