import { StatusCategory } from '@prisma/client';

export interface WorkflowStatusTemplate {
  name: string;
  category: StatusCategory;
  color: string;
}

/** Columns every new project starts with, in board order. */
export const DEFAULT_WORKFLOW_STATUSES: readonly WorkflowStatusTemplate[] = [
  { name: 'Backlog', category: StatusCategory.BACKLOG, color: '#94a3b8' },
  { name: 'Todo', category: StatusCategory.TODO, color: '#64748b' },
  {
    name: 'In Progress',
    category: StatusCategory.IN_PROGRESS,
    color: '#3b82f6',
  },
  { name: 'In Review', category: StatusCategory.IN_REVIEW, color: '#a855f7' },
  { name: 'Done', category: StatusCategory.DONE, color: '#22c55e' },
];
