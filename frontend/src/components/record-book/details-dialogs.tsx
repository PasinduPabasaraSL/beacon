import { PenLine } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { SignatureDialog } from '@/components/signature/signature-dialog'
import { SignatureImage } from '@/components/signature/signature-image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useMySignature,
  useSignRecordBook,
  useUpdateRecordBookDetails,
} from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { RECORD_BOOK_DETAIL_FIELDS as DETAIL_FIELDS } from '@/lib/format'
import type { RecordBookDetails } from '@/lib/types'

interface DetailsDialogProps {
  projectId: string
  details: RecordBookDetails
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditDetailsDialog(props: DetailsDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        {props.open && <EditDetailsForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function EditDetailsForm({
  projectId,
  details,
  onOpenChange,
}: DetailsDialogProps) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      DETAIL_FIELDS.map(({ key }) => [key, details[key] ?? '']),
    ),
  )
  const save = useUpdateRecordBookDetails(projectId)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = Object.fromEntries(
      DETAIL_FIELDS.map(({ key }) => [key, values[key].trim() || null]),
    ) as Record<keyof RecordBookDetails, string | null>
    save.mutate(
      {
        ...trimmed,
        moduleTitle: trimmed.moduleTitle ?? '',
        level: trimmed.level ?? '',
      },
      {
        onSuccess: () => {
          toast.success('Details saved')
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Record book details</DialogTitle>
        <DialogDescription>
          Printed on the cover and the details page. Leave the module and level
          blank to use the defaults.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        {DETAIL_FIELDS.map(({ key, label, placeholder }) => (
          <div
            key={key}
            className={
              key === 'moduleTitle' || key === 'university'
                ? 'flex flex-col gap-2 sm:col-span-2'
                : 'flex flex-col gap-2'
            }
          >
            <Label htmlFor={`detail-${key}`}>{label}</Label>
            <Input
              id={`detail-${key}`}
              maxLength={key === 'level' || key === 'batch' ? 40 : 120}
              placeholder={placeholder}
              value={values[key]}
              onChange={(e) =>
                setValues((current) => ({ ...current, [key]: e.target.value }))
              }
            />
          </div>
        ))}
      </div>
      {save.error && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage(save.error)}
        </p>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving...' : 'Save details'}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface SignDetailsDialogProps {
  projectId: string
  /** Students also confirm their registration number. */
  isStudent: boolean
  registrationNumber: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignDetailsDialog(props: SignDetailsDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {props.open && <SignDetailsForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

const REGISTRATION_PATTERN = /^[A-Za-z0-9/-]{3,20}$/

function SignDetailsForm({
  projectId,
  isStudent,
  registrationNumber: savedNumber,
  onOpenChange,
}: SignDetailsDialogProps) {
  const signature = useMySignature()
  const sign = useSignRecordBook(projectId)
  const [registrationNumber, setRegistrationNumber] = useState(
    savedNumber ?? '',
  )
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const saved = signature.data?.signature

  const numberError = !isStudent
    ? null
    : registrationNumber.trim() === ''
      ? 'Enter your registration number'
      : !REGISTRATION_PATTERN.test(registrationNumber.trim())
        ? 'Use 3-20 letters, digits, "/" or "-"'
        : null

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (numberError || !saved) return
    sign.mutate(
      isStudent ? { registrationNumber: registrationNumber.trim() } : {},
      {
        onSuccess: () => {
          toast.success('Details page signed')
          onOpenChange(false)
        },
      },
    )
  }

  const form = (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Sign the details page</DialogTitle>
        <DialogDescription>
          {isStudent
            ? 'Confirms you are a member of this group.'
            : 'Confirms you supervise this group.'}
        </DialogDescription>
      </DialogHeader>

      {isStudent && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="registration-number">Registration number</Label>
          <Input
            id="registration-number"
            maxLength={20}
            placeholder="e.g. 224001A"
            className="font-mono"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            aria-invalid={submitted && !!numberError}
          />
          {submitted && numberError && (
            <p className="text-destructive text-sm">{numberError}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Your signature</p>
        {signature.isPending ? (
          <Skeleton className="h-20" />
        ) : saved ? (
          <div className="flex items-center gap-3 rounded-md border p-3">
            <div className="flex h-14 min-w-0 flex-1 items-center">
              <SignatureImage src={saved.image} alt="Your signature" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSignatureOpen(true)}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 rounded-md border border-dashed p-4">
            <p className="text-muted-foreground text-sm">
              Upload, draw or type your signature first.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSignatureOpen(true)}
            >
              <PenLine /> Create signature
            </Button>
          </div>
        )}
      </div>

      {sign.error && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {errorMessage(sign.error)}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!saved || sign.isPending}>
          {sign.isPending ? 'Signing...' : 'Sign details page'}
        </Button>
      </DialogFooter>
    </form>
  )

  // Outside the form: React submit events bubble through portals.
  return (
    <>
      {form}
      <SignatureDialog open={signatureOpen} onOpenChange={setSignatureOpen} />
    </>
  )
}
