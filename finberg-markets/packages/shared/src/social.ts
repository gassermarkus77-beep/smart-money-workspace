import { z } from 'zod';

export const PostKindSchema = z.enum(['idea', 'note', 'question']);
export type PostKind = z.infer<typeof PostKindSchema>;

export const PostSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  kind: PostKindSchema,
  title: z.string().max(140).optional(),
  bodyMarkdown: z.string().min(1).max(20_000),
  chartSnapshotUrl: z.string().url().optional(),
  chartLayoutId: z.string().uuid().optional(),
  instrumentId: z.string().uuid().optional(),
  bias: z.enum(['long', 'short', 'neutral']).optional(),
  timeframe: z.string().optional(),
  entryPrice: z.number().optional(),
  targetPrice: z.number().optional(),
  stopPrice: z.number().optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
  status: z.enum(['open', 'closed_win', 'closed_loss', 'expired', 'cancelled']).default('open'),
  realizedR: z.number().optional(),
  tags: z.array(z.string()).max(10).default([]),
  likesCount: z.number().int().nonnegative().default(0),
  commentsCount: z.number().int().nonnegative().default(0),
  viewsCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Post = z.infer<typeof PostSchema>;

export const CommentSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  authorId: z.string().uuid(),
  bodyMarkdown: z.string().min(1).max(5_000),
  likesCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
});
export type Comment = z.infer<typeof CommentSchema>;
