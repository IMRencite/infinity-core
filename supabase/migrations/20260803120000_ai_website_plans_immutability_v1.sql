-- AI website generation plans — database-enforced semantic immutability (approved + terminal)

CREATE OR REPLACE FUNCTION public.prevent_ai_website_plan_semantic_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_semantically_locked BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ai_website_generation_plans cannot be deleted';
  END IF;

  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  is_semantically_locked := (
    OLD.status = 'approved'
    OR OLD.status IN ('rejected_schema', 'rejected_policy', 'rejected', 'failed', 'superseded')
    OR (
      OLD.status = 'completed'
      AND OLD.completed_at IS NOT NULL
      AND OLD.structured_plan IS NOT NULL
    )
  );

  IF NOT is_semantically_locked THEN
    RETURN NEW;
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.mission_id IS DISTINCT FROM OLD.mission_id
    OR NEW.runtime_instance_id IS DISTINCT FROM OLD.runtime_instance_id
    OR NEW.opportunity_id IS DISTINCT FROM OLD.opportunity_id
    OR NEW.venture_blueprint_id IS DISTINCT FROM OLD.venture_blueprint_id
    OR NEW.build_id IS DISTINCT FROM OLD.build_id
    OR NEW.build_specification_id IS DISTINCT FROM OLD.build_specification_id
    OR NEW.provider IS DISTINCT FROM OLD.provider
    OR NEW.model IS DISTINCT FROM OLD.model
    OR NEW.mode IS DISTINCT FROM OLD.mode
    OR NEW.plan_version IS DISTINCT FROM OLD.plan_version
    OR NEW.prompt_version IS DISTINCT FROM OLD.prompt_version
    OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
    OR NEW.context_manifest IS DISTINCT FROM OLD.context_manifest
    OR NEW.context_hash IS DISTINCT FROM OLD.context_hash
    OR NEW.structured_plan IS DISTINCT FROM OLD.structured_plan
    OR NEW.output_hash IS DISTINCT FROM OLD.output_hash
    OR NEW.recommendation IS DISTINCT FROM OLD.recommendation
    OR NEW.confidence IS DISTINCT FROM OLD.confidence
    OR NEW.usage IS DISTINCT FROM OLD.usage
    OR NEW.estimated_cost IS DISTINCT FROM OLD.estimated_cost
    OR NEW.policy_results IS DISTINCT FROM OLD.policy_results
    OR NEW.validation_results IS DISTINCT FROM OLD.validation_results
    OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
  THEN
    RAISE EXCEPTION 'ai_website_generation_plans semantic fields are immutable once approved or terminal';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ai_website_plans_prevent_semantic_mutation
  BEFORE UPDATE OR DELETE ON public.ai_website_generation_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_ai_website_plan_semantic_mutation();

COMMENT ON FUNCTION public.prevent_ai_website_plan_semantic_mutation() IS
  'Locks semantic AI website plan fields after approval or terminal completion; revisions require a new row.';
