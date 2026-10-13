-- Integrity rules for the record book that Prisma schema cannot express.

ALTER TABLE "meeting_records"
  ADD CONSTRAINT "meeting_records_date_not_future" CHECK ("meeting_date" <= "created_at"::date),
  ADD CONSTRAINT "meeting_records_certified_signed" CHECK (
    "status" <> 'CERTIFIED' OR ("signature_image" IS NOT NULL AND "certified_at" IS NOT NULL)
  ),
  ADD CONSTRAINT "meeting_records_signature_image_format" CHECK ("signature_image" ~ '^data:image/(png|jpeg);base64,');

ALTER TABLE "user_signatures"
  ADD CONSTRAINT "user_signatures_image_format" CHECK ("image" ~ '^data:image/(png|jpeg);base64,');

ALTER TABLE "record_book_signatures"
  ADD CONSTRAINT "record_book_signatures_image_format" CHECK ("image" ~ '^data:image/(png|jpeg);base64,');
