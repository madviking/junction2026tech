-- visits: a resident can go back one step. The step back is recorded as an 'undo' event
-- (the log stays append-only); replay drops the resident's last tap. Owner: visits.
ALTER TABLE visit_events DROP CONSTRAINT visit_events_kind_check;
ALTER TABLE visit_events ADD CONSTRAINT visit_events_kind_check
    CHECK (kind IN ('outcome', 'symptoms', 'clinician_answer', 'clinician_move', 'undo'));
