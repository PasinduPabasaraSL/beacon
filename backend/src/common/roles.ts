import { ProjectRole, WorkspaceRole } from '@prisma/client';

export const LOGGING_ROLES: ProjectRole[] = [
  ProjectRole.OWNER,
  ProjectRole.MEMBER,
];

export const REVIEWER_ROLES: ProjectRole[] = [
  ProjectRole.SUPERVISOR,
  ProjectRole.OWNER,
];

/** Roles that manage a project's milestones. */
export const PLANNING_ROLES: ProjectRole[] = [
  ProjectRole.OWNER,
  ProjectRole.SUPERVISOR,
];

/** Workspace roles that manage the shared semester calendar. */
export const WORKSPACE_ADMIN_ROLES: WorkspaceRole[] = [
  WorkspaceRole.OWNER,
  WorkspaceRole.ADMIN,
];
