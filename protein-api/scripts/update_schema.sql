-- Add JSONB columns to fragments table if they don't exist
DO $$
BEGIN
    -- Add motifs_data column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'fragments' AND column_name = 'motifs_data'
    ) THEN
        ALTER TABLE fragments ADD COLUMN motifs_data JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add confidence_scores column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'fragments' AND column_name = 'confidence_scores'
    ) THEN
        ALTER TABLE fragments ADD COLUMN confidence_scores JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Create indexes for the new JSONB columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fragments_motifs_data'
    ) THEN
        CREATE INDEX idx_fragments_motifs_data ON fragments USING GIN (motifs_data);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fragments_confidence_scores'
    ) THEN
        CREATE INDEX idx_fragments_confidence_scores ON fragments USING GIN (confidence_scores);
    END IF;
END
$$;

-- Migrate existing data from motifs table to JSONB columns
DO $$
DECLARE
    frag_record RECORD;
    motifs_json JSONB;
    confidence_scores_json JSONB;
    motif_records RECORD;
    confidence_records RECORD;
BEGIN
    -- Process each fragment
    FOR frag_record IN SELECT fragment_id FROM fragments LOOP
        -- Get motifs for the fragment (excluding confidence scores)
        motifs_json := '[]'::jsonb;
        FOR motif_records IN 
            SELECT * FROM motifs 
            WHERE fragment_id = frag_record.fragment_id AND motif_type != 'CONFIDENCE'
        LOOP
            motifs_json := motifs_json || jsonb_build_object(
                'pattern', motif_records.motif_pattern,
                'type', motif_records.motif_type,
                'startPosition', motif_records.start_position,
                'endPosition', motif_records.end_position
            );
        END LOOP;
        
        -- Get confidence scores for the fragment
        confidence_scores_json := '[]'::jsonb;
        FOR confidence_records IN 
            SELECT * FROM motifs 
            WHERE fragment_id = frag_record.fragment_id AND motif_type = 'CONFIDENCE'
            ORDER BY start_position
        LOOP
            -- Ensure confidence score is within [0,1] range
            confidence_scores_json := confidence_scores_json || to_jsonb(
                LEAST(GREATEST(confidence_records.confidence_score::float, 0), 1)
            );
        END LOOP;
        
        -- Update the fragment with the JSONB data
        UPDATE fragments 
        SET 
            motifs_data = motifs_json,
            confidence_scores = confidence_scores_json
        WHERE fragment_id = frag_record.fragment_id;
    END LOOP;
END
$$; 