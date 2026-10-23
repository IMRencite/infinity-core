-- ONPV opportunity lane: uses autonomous_portfolio_candidate_state with lane ONPV_OPPORTUNITY.
-- Full lifecycle lives in payload.opportunity_lifecycle; terminal_state maps to existing enum.

CREATE INDEX IF NOT EXISTS autonomous_portfolio_candidate_state_venture_lane_idx
  ON public.autonomous_portfolio_candidate_state (venture_id, lane);

COMMENT ON TABLE public.autonomous_portfolio_candidate_state IS
  'Cross-serverless candidate state: CONTENT_SLUG, SHIRT_CONCEPT, AUTHORITY_GAP, ONPV_OPPORTUNITY (payload.opportunity_lifecycle).';
