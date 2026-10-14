import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MeetingPhase,
  MeetingRecordStatus,
  Prisma,
  ProjectRole,
} from '@prisma/client';
import { LOGGING_ROLES, PLANNING_ROLES } from '../common/roles';
import { UserSummary, userSummarySelect } from '../common/user-summary';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMeetingDto,
  ReviewMeetingDto,
  SignRecordBookDto,
  UpdateMeetingDto,
  UpdateRecordBookDetailsDto,
} from './dto/record-book.dto';
import { meetingSelect, toMeetingResponse } from './meeting-response';

export const PHASE_ORDER: MeetingPhase[] = [
  MeetingPhase.PROBLEM_IDENTIFICATION,
  MeetingPhase.ANALYSIS_DESIGN,
  MeetingPhase.SYSTEM_DESIGN,
  MeetingPhase.DEVELOPMENT_EVALUATION,
];

const DETAIL_DEFAULTS = {
  moduleTitle: 'IS2901 - Software Development Project',
  level: 'Level 02',
  batch: null,
  groupName: null,
  department: null,
  faculty: null,
  university: null,
};

const detailsSelect = {
  moduleTitle: true,
  level: true,
  batch: true,
  groupName: true,
  department: true,
  faculty: true,
  university: true,
} as const;

function dateOnly(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class RecordBookService {
  constructor(private readonly prisma: PrismaService) {}

  async get(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        key: true,
        name: true,
        logo: true,
        workspace: { select: { id: true, name: true } },
        recordBook: { select: detailsSelect },
        members: {
          orderBy: { joinedAt: 'asc' },
          select: {
            role: true,
            user: {
              select: { ...userSummarySelect, registrationNumber: true },
            },
          },
        },
        recordBookSignatures: {
          select: { userId: true, image: true, signedAt: true },
        },
        meetings: { orderBy: { number: 'asc' }, select: meetingSelect },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const signatureOf = (userId: string) => {
      const signature = project.recordBookSignatures.find(
        (s) => s.userId === userId,
      );
      return signature
        ? { image: signature.image, signedAt: signature.signedAt }
        : null;
    };
    const people = (roles: ProjectRole[]) =>
      project.members
        .filter((m) => roles.includes(m.role))
        .map(({ role, user: { registrationNumber, ...user } }) => ({
          user,
          role,
          registrationNumber,
          signature: signatureOf(user.id),
        }));
    const meetings = project.meetings.map(toMeetingResponse);

    return {
      project: {
        id: project.id,
        key: project.key,
        name: project.name,
        logo: project.logo,
        workspace: project.workspace,
      },
      details: project.recordBook ?? DETAIL_DEFAULTS,
      supervisors: people([ProjectRole.SUPERVISOR]),
      members: people(LOGGING_ROLES),
      phases: PHASE_ORDER.map((phase) => ({
        phase,
        meetings: meetings.filter((m) => m.phase === phase),
      })),
    };
  }

  async updateDetails(
    projectId: string,
    user: UserSummary,
    dto: UpdateRecordBookDetailsDto,
  ) {
    await this.requireRole(
      projectId,
      user,
      PLANNING_ROLES,
      'Only project owners and supervisors can edit the record book details',
    );
    // PUT replaces the details; blank fields fall back to the defaults.
    const details = {
      moduleTitle: dto.moduleTitle || DETAIL_DEFAULTS.moduleTitle,
      level: dto.level || DETAIL_DEFAULTS.level,
      batch: dto.batch || null,
      groupName: dto.groupName || null,
      department: dto.department || null,
      faculty: dto.faculty || null,
      university: dto.university || null,
    };
    await this.prisma.recordBook.upsert({
      where: { projectId },
      create: { projectId, ...details },
      update: details,
    });
    return this.get(projectId);
  }

  async sign(projectId: string, user: UserSummary, dto: SignRecordBookDto) {
    const role = await this.requireRole(
      projectId,
      user,
      [...LOGGING_ROLES, ProjectRole.SUPERVISOR],
      'Only group members and supervisors sign the record book',
    );
    const signature = await this.requireSignature(user);

    if (LOGGING_ROLES.includes(role)) {
      const { registrationNumber } = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { registrationNumber: true },
      });
      const next = dto.registrationNumber || registrationNumber;
      if (!next) {
        throw new BadRequestException(
          'Add your registration number before signing',
        );
      }
      if (next !== registrationNumber) {
        try {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { registrationNumber: next },
          });
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ConflictException(
              'That registration number belongs to another student',
            );
          }
          throw error;
        }
      }
    }

    await this.prisma.recordBookSignature.upsert({
      where: { projectId_userId: { projectId, userId: user.id } },
      create: { projectId, userId: user.id, image: signature.image },
      update: { image: signature.image, signedAt: new Date() },
    });
    return this.get(projectId);
  }

  async createMeeting(
    projectId: string,
    user: UserSummary,
    dto: CreateMeetingDto,
  ) {
    await this.requireRole(
      projectId,
      user,
      LOGGING_ROLES,
      'Only group members can add record book entries',
    );
    const meetingDate = this.assertPastOrToday(dto.meetingDate);
    await this.assertAttendees(projectId, dto.attendeeIds);

    const meeting = await this.prisma.$transaction(async (tx) => {
      const { meetingCounter } = await tx.project.update({
        where: { id: projectId },
        data: { meetingCounter: { increment: 1 } },
        select: { meetingCounter: true },
      });
      return tx.meetingRecord.create({
        data: {
          projectId,
          number: meetingCounter,
          phase: dto.phase,
          mode: dto.mode,
          meetingDate,
          summary: dto.summary,
          createdById: user.id,
          attendees: {
            create: dto.attendeeIds.map((userId) => ({ userId })),
          },
        },
        select: meetingSelect,
      });
    });
    return toMeetingResponse(meeting);
  }

  async updateMeeting(
    projectId: string,
    meetingId: string,
    user: UserSummary,
    dto: UpdateMeetingDto,
  ) {
    await this.requireRole(
      projectId,
      user,
      LOGGING_ROLES,
      'Only group members can edit record book entries',
    );
    await this.getEditableMeeting(projectId, meetingId);
    const meetingDate = dto.meetingDate
      ? this.assertPastOrToday(dto.meetingDate)
      : undefined;
    if (dto.attendeeIds) await this.assertAttendees(projectId, dto.attendeeIds);

    const meeting = await this.prisma.meetingRecord.update({
      where: { id: meetingId },
      data: {
        phase: dto.phase,
        mode: dto.mode,
        meetingDate,
        summary: dto.summary,
        // Edits after "changes requested" go back to the supervisor.
        status: MeetingRecordStatus.SUBMITTED,
        attendees: dto.attendeeIds && {
          deleteMany: {},
          create: dto.attendeeIds.map((userId) => ({ userId })),
        },
      },
      select: meetingSelect,
    });
    return toMeetingResponse(meeting);
  }

  async removeMeeting(projectId: string, meetingId: string, user: UserSummary) {
    await this.requireRole(
      projectId,
      user,
      LOGGING_ROLES,
      'Only group members can delete record book entries',
    );
    await this.getEditableMeeting(projectId, meetingId);
    await this.prisma.meetingRecord.delete({ where: { id: meetingId } });
  }

  async reviewMeeting(
    projectId: string,
    meetingId: string,
    user: UserSummary,
    dto: ReviewMeetingDto,
  ) {
    await this.requireRole(
      projectId,
      user,
      [ProjectRole.SUPERVISOR],
      'Only the group supervisor can certify the record book',
    );
    await this.getEditableMeeting(projectId, meetingId);

    const data: Prisma.MeetingRecordUpdateInput =
      dto.decision === 'CERTIFIED'
        ? {
            status: MeetingRecordStatus.CERTIFIED,
            supervisorComment: dto.comment || null,
            certifiedBy: { connect: { id: user.id } },
            certifiedAt: new Date(),
            signatureImage: (await this.requireSignature(user)).image,
          }
        : {
            status: MeetingRecordStatus.CHANGES_REQUESTED,
            supervisorComment: dto.comment,
          };

    const meeting = await this.prisma.meetingRecord.update({
      where: { id: meetingId },
      data,
      select: meetingSelect,
    });
    return toMeetingResponse(meeting);
  }

  private async requireRole(
    projectId: string,
    user: UserSummary,
    allowed: ProjectRole[],
    message: string,
  ): Promise<ProjectRole> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        members: { where: { userId: user.id }, select: { role: true } },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    const role = project.members[0]?.role;
    if (!role || !allowed.includes(role)) {
      throw new ForbiddenException(message);
    }
    return role;
  }

  private async requireSignature(user: UserSummary) {
    const signature = await this.prisma.userSignature.findUnique({
      where: { userId: user.id },
      select: { image: true },
    });
    if (!signature) {
      throw new BadRequestException('Save your signature first');
    }
    return signature;
  }

  private async getEditableMeeting(projectId: string, meetingId: string) {
    const meeting = await this.prisma.meetingRecord.findFirst({
      where: { id: meetingId, projectId },
      select: { status: true },
    });
    if (!meeting) {
      throw new NotFoundException(`Record book entry ${meetingId} not found`);
    }
    if (meeting.status === MeetingRecordStatus.CERTIFIED) {
      throw new ConflictException('Certified entries can no longer be changed');
    }
  }

  private assertPastOrToday(day: string): Date {
    const date = dateOnly(day);
    if (date > todayUtc()) {
      throw new BadRequestException('The meeting date cannot be in the future');
    }
    return date;
  }

  private async assertAttendees(projectId: string, userIds: string[]) {
    const count = await this.prisma.projectMember.count({
      where: {
        projectId,
        userId: { in: userIds },
        role: { in: LOGGING_ROLES },
      },
    });
    if (count !== userIds.length) {
      throw new BadRequestException(
        'Members present must be students in this group',
      );
    }
  }
}
