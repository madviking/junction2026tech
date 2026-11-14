-- Decisions calls cost fractions of a cent (e.g. $0.0000105); NUMERIC(12, 6) rounded
-- them. Ten decimals keep the billed cost exact for the spend cap and usage page.
ALTER TABLE llm_usage ALTER COLUMN cost_usd TYPE NUMERIC(16, 10);
