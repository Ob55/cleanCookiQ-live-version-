-- ============================================================
-- Surface institution_code in the funder deal-flow view so the
-- funder portal can render and export the new identifier.
--
-- DROP-and-create because we're inserting institution_code mid-list
-- between institution_id and institution_name — Postgres rejects
-- column-order changes on CREATE OR REPLACE VIEW (ERROR 42P16).
-- ============================================================

DROP VIEW IF EXISTS public.v_funder_deal_flow CASCADE;

CREATE VIEW public.v_funder_deal_flow
WITH (security_invoker = true) AS
SELECT
  p.id                                                AS project_id,
  p.title                                             AS project_title,
  p.status                                            AS project_status,
  p.total_budget,
  p.start_date,
  p.target_completion,
  i.id                                                AS institution_id,
  i.institution_code                                  AS institution_code,
  i.name                                              AS institution_name,
  i.county                                            AS county,
  i.institution_type                                  AS institution_type,
  i.current_fuel                                      AS baseline_fuel,
  i.number_of_students                                AS students,
  i.monthly_fuel_spend                                AS monthly_fuel_spend,
  i.annual_savings_ksh                                AS annual_savings_ksh,
  pr.id                                               AS provider_id,
  pr.name                                             AS provider_name,
  cp.estimated_annual_credits                         AS forecast_annual_tco2e,
  COALESCE(rs.max_score, 0)                           AS max_open_risk_score,
  COALESCE(rs.open_count, 0)                          AS open_risk_count,
  COALESCE(fp.committed_total, 0)                     AS already_committed_capital,
  CASE
    WHEN p.total_budget IS NOT NULL AND p.total_budget > 0
    THEN GREATEST(p.total_budget - COALESCE(fp.committed_total, 0), 0)
    ELSE NULL
  END                                                 AS funding_gap
FROM public.projects p
JOIN public.institutions i ON i.id = p.institution_id
LEFT JOIN public.providers pr ON pr.id = p.provider_id
LEFT JOIN public.carbon_projects cp ON cp.project_id = p.id
LEFT JOIN (
  SELECT project_id, MAX(severity * likelihood) AS max_score, COUNT(*) AS open_count
  FROM public.risk_register
  WHERE status IN ('open','mitigating')
  GROUP BY project_id
) rs ON rs.project_id = p.id
LEFT JOIN (
  SELECT project_id, SUM(capital_amount) AS committed_total
  FROM public.funder_portfolio
  WHERE status IN ('committed','disbursed')
  GROUP BY project_id
) fp ON fp.project_id = p.id;

GRANT SELECT ON public.v_funder_deal_flow TO authenticated, anon;
