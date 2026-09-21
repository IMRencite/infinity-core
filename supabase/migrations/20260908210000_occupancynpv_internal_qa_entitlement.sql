-- Allow a non-commercial INTERNAL_QA offer for founder/operator product inspection.
-- Does not weaken RLS. Does not create revenue. Service role still required to insert entitlements.

ALTER TABLE public.occupancynpv_entitlements
  DROP CONSTRAINT IF EXISTS occupancynpv_entitlements_offer_id_check;

ALTER TABLE public.occupancynpv_entitlements
  ADD CONSTRAINT occupancynpv_entitlements_offer_id_check
  CHECK (offer_id IN ('PROFESSIONAL', 'PER_DEAL', 'INTERNAL_QA'));
