import { PenLine, Settings2 } from 'lucide-react'
import { useState } from 'react'
import {
  EditDetailsDialog,
  SignDetailsDialog,
} from '@/components/record-book/details-dialogs'
import { SignatureImage } from '@/components/signature/signature-image'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { UserAvatar } from '@/components/user-avatar'
import {
  displayName,
  formatDate,
  RECORD_BOOK_DETAIL_FIELDS,
  ROLE_LABELS,
} from '@/lib/format'
import type { RecordBook, RecordBookPerson } from '@/lib/types'

function PersonRow({
  person,
  showRegistration,
}: {
  person: RecordBookPerson
  showRegistration: boolean
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <UserAvatar user={person.user} size="sm" withTooltip={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {displayName(person.user)}
        </p>
        <p className="text-muted-foreground text-xs">
          {showRegistration
            ? (person.registrationNumber ?? 'No registration number')
            : ROLE_LABELS[person.role]}
          {showRegistration && person.role === 'OWNER' && ' · Group lead'}
        </p>
      </div>
      <div className="flex h-10 w-32 items-center justify-end">
        {person.signature ? (
          <SignatureImage
            src={person.signature.image}
            alt={`Signature of ${displayName(person.user)}`}
            className="max-h-10"
          />
        ) : (
          <span className="text-muted-foreground text-xs">Not signed</span>
        )}
      </div>
    </li>
  )
}

export function RecordBookDetailsCard({
  book,
  actingUserId,
  canEditDetails,
}: {
  book: RecordBook
  actingUserId: string | null
  canEditDetails: boolean
}) {
  const [dialog, setDialog] = useState<'edit' | 'sign' | null>(null)
  const close = (open: boolean) => !open && setDialog(null)

  const me =
    book.members.find((p) => p.user.id === actingUserId) ??
    book.supervisors.find((p) => p.user.id === actingUserId)
  const isStudent = !!me && me.role !== 'SUPERVISOR'
  const signedCount = [...book.supervisors, ...book.members].filter(
    (p) => p.signature,
  ).length
  const total = book.supervisors.length + book.members.length

  return (
    <Card>
      <CardHeader className="max-sm:has-data-[slot=card-action]:grid-cols-1">
        <CardTitle>Details page</CardTitle>
        <CardDescription>
          {book.details.moduleTitle} · {book.details.level} · signed by{' '}
          {signedCount} of {total}
        </CardDescription>
        <CardAction className="flex flex-wrap gap-2 max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-3 max-sm:justify-self-start">
          {canEditDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog('edit')}
            >
              <Settings2 /> Edit details
            </Button>
          )}
          {me && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog('sign')}
            >
              <PenLine />
              {me.signature ? 'Sign again' : 'Sign details page'}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_1fr_1.2fr]">
        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 text-sm lg:col-span-1">
          {RECORD_BOOK_DETAIL_FIELDS.map(({ key, label }) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 wrap-break-word">
                {book.details[key] ?? (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Supervisor
          </p>
          {book.supervisors.length === 0 ? (
            <p className="text-muted-foreground py-2 text-sm">
              No supervisor in this project yet.
            </p>
          ) : (
            <ul className="divide-y">
              {book.supervisors.map((person) => (
                <PersonRow
                  key={person.user.id}
                  person={person}
                  showRegistration={false}
                />
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Group members
          </p>
          <ul className="divide-y">
            {book.members.map((person) => (
              <PersonRow
                key={person.user.id}
                person={person}
                showRegistration
              />
            ))}
          </ul>
          {me?.signature && (
            <p className="text-muted-foreground pt-1 text-xs">
              You signed on {formatDate(me.signature.signedAt, true)}.
            </p>
          )}
        </div>
      </CardContent>

      <EditDetailsDialog
        projectId={book.project.id}
        details={book.details}
        open={dialog === 'edit'}
        onOpenChange={close}
      />
      {me && (
        <SignDetailsDialog
          projectId={book.project.id}
          isStudent={isStudent}
          registrationNumber={me.registrationNumber}
          open={dialog === 'sign'}
          onOpenChange={close}
        />
      )}
    </Card>
  )
}
