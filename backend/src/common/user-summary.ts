import { Prisma } from '@prisma/client';

export const userSummarySelect = {
  id: true,
  githubLogin: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export type UserSummary = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;
