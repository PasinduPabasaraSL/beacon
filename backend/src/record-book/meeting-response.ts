import { Prisma } from '@prisma/client';
import { userSummarySelect } from '../common/user-summary';

export const meetingSelect = {
  id: true,
  number: true,
  phase: true,
  mode: true,
  meetingDate: true,
  summary: true,
  status: true,
  supervisorComment: true,
  certifiedAt: true,
  signatureImage: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: userSummarySelect },
  certifiedBy: { select: userSummarySelect },
  attendees: {
    select: { user: { select: userSummarySelect } },
    orderBy: { user: { name: 'asc' } },
  },
} satisfies Prisma.MeetingRecordSelect;

type MeetingRow = Prisma.MeetingRecordGetPayload<{
  select: typeof meetingSelect;
}>;

export function toMeetingResponse(meeting: MeetingRow) {
  return { ...meeting, attendees: meeting.attendees.map((a) => a.user) };
}
