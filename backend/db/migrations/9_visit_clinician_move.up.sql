-- visits: the clinician can move a visit to the clinician stage from any non-terminal
-- stage; that jump is recorded as a 'clinician_move' event (payload {to}). Owner: visits.
ALTER TABLE visit_events DROP CONSTRAINT visit_events_kind_check;
ALTER TABLE visit_events ADD CONSTRAINT visit_events_kind_check
    CHECK (kind IN ('outcome', 'symptoms', 'clinician_answer', 'clinician_move'));
