import '@fontsource/dancing-script/600.css'
import { PenLine, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { SignatureImage } from '@/components/signature/signature-image'
import { SignaturePad } from '@/components/signature/signature-pad'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useDeleteSignature,
  useMe,
  useMySignature,
  useSaveSignature,
} from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { formatDate, SIGNATURE_METHOD_LABELS } from '@/lib/format'
import {
  exportSignature,
  renderTypedSignature,
  SIGNATURE_FONT,
  uploadedSignature,
} from '@/lib/signature'
import type { SignatureMethod } from '@/lib/types'

interface SignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Shown under the title, e.g. why the signature is needed right now. */
  description?: string
  onSaved?: () => void
}

export function SignatureDialog(props: SignatureDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {props.open && <SignatureForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function SignatureForm({
  onOpenChange,
  description,
  onSaved,
}: SignatureDialogProps) {
  const { data: me } = useMe()
  const current = useMySignature()
  const save = useSaveSignature()
  const remove = useDeleteSignature()

  const [method, setMethod] = useState<SignatureMethod>('DRAWN')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasInk, setHasInk] = useState(false)
  const [typedName, setTypedName] = useState(me?.user.name ?? '')
  const [upload, setUpload] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ready =
    method === 'DRAWN'
      ? hasInk
      : method === 'TYPED'
        ? typedName.trim() !== ''
        : upload !== null

  const onFile = async (file: File | undefined) => {
    setError(null)
    setUpload(null)
    if (!file) return
    try {
      setUpload(await uploadedSignature(file))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    let image: string | null
    try {
      image =
        method === 'DRAWN'
          ? canvasRef.current && exportSignature(canvasRef.current)
          : method === 'TYPED'
            ? await renderTypedSignature(typedName.trim())
            : upload
    } catch (e) {
      setError(errorMessage(e))
      return
    }
    if (!image) {
      setError('Add a signature first')
      return
    }
    save.mutate(
      { method, image },
      {
        onSuccess: () => {
          toast.success('Signature saved')
          onOpenChange(false)
          onSaved?.()
        },
      },
    )
  }

  const saved = current.data?.signature
  const failure = error ?? (save.error && errorMessage(save.error))

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-w-0 flex-col gap-5"
      noValidate
    >
      <DialogHeader>
        <DialogTitle>Your signature</DialogTitle>
        <DialogDescription>
          {description ??
            'Used to sign the record book. Certified entries keep the signature used at the time.'}
        </DialogDescription>
      </DialogHeader>

      {current.isPending ? (
        <Skeleton className="h-20" />
      ) : (
        saved && (
          <div className="flex items-center gap-4 rounded-md border p-3">
            <div className="flex h-14 min-w-0 flex-1 items-center">
              <SignatureImage src={saved.image} alt="Your saved signature" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-muted-foreground text-xs">
                {SIGNATURE_METHOD_LABELS[saved.method]} ·{' '}
                {formatDate(saved.updatedAt)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(undefined, {
                    onSuccess: () => toast.success('Signature removed'),
                  })
                }
              >
                <Trash2 /> Remove
              </Button>
            </div>
          </div>
        )
      )}

      <Tabs
        value={method}
        onValueChange={(value) => {
          setMethod(value as SignatureMethod)
          setError(null)
        }}
      >
        <TabsList className="w-full">
          <TabsTrigger value="DRAWN">Draw</TabsTrigger>
          <TabsTrigger value="TYPED">Type</TabsTrigger>
          <TabsTrigger value="UPLOAD">Upload</TabsTrigger>
        </TabsList>

        <TabsContent
          value="DRAWN"
          forceMount
          className="pt-2 data-[state=inactive]:hidden"
        >
          <SignaturePad
            canvasRef={canvasRef}
            hasInk={hasInk}
            onInkChange={setHasInk}
          />
        </TabsContent>

        <TabsContent value="TYPED" className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="signature-name">Full name</Label>
            <Input
              id="signature-name"
              maxLength={60}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
            />
          </div>
          <div className="bg-muted/30 flex h-24 items-center overflow-hidden rounded-md border border-dashed px-4">
            <span
              className="truncate text-4xl font-semibold"
              style={{ fontFamily: SIGNATURE_FONT }}
              data-testid="typed-signature-preview"
            >
              {typedName || 'Your name'}
            </span>
          </div>
        </TabsContent>

        <TabsContent value="UPLOAD" className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="signature-file">Image of your signature</Label>
            <Input
              id="signature-file"
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <p className="text-muted-foreground text-xs">
              PNG or JPEG. Sign on white paper; the background is removed.
            </p>
          </div>
          {upload && (
            <div className="bg-muted/30 flex h-24 items-center justify-center rounded-md border border-dashed p-2">
              <SignatureImage
                src={upload}
                alt="Uploaded signature preview"
                className="max-h-20"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {failure && (
        <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">
          {failure}
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
        <Button type="submit" disabled={!ready || save.isPending}>
          {save.isPending
            ? 'Saving...'
            : saved
              ? 'Replace signature'
              : 'Save signature'}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Sidebar entry for managing the acting user's signature. */
export function MySignatureButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground justify-start"
        onClick={() => setOpen(true)}
      >
        <PenLine /> My signature
      </Button>
      <SignatureDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
