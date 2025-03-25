-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create proteins table
CREATE TABLE IF NOT EXISTS proteins (
  protein_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(1000),
  molecular_weight FLOAT CHECK (molecular_weight > 0),
  sequence_length INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sequence_url VARCHAR(255)
);

-- Create fragments table
CREATE TABLE IF NOT EXISTS fragments (
  fragment_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  protein_id UUID REFERENCES proteins(protein_id) ON DELETE CASCADE,
  sequence VARCHAR(50) CHECK (sequence ~ '^[A-Z]{2,50}$'),
  start_position INTEGER,
  end_position INTEGER,
  secondary_structure VARCHAR(50) CHECK (secondary_structure ~ '^[HEC]+$'),
  motifs_data JSONB DEFAULT '[]'::jsonb,
  confidence_scores JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  url VARCHAR(255)
);

-- Create motifs table
CREATE TABLE IF NOT EXISTS motifs (
  motif_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fragment_id UUID REFERENCES fragments(fragment_id) ON DELETE CASCADE,
  motif_pattern VARCHAR(50) NOT NULL,
  motif_type VARCHAR(50),
  start_position INTEGER,
  end_position INTEGER,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'basic' CHECK (role IN ('admin', 'basic'))
);

-- Insert default users
INSERT INTO users (id, name, role) 
VALUES 
  ('admin-user-001', 'Admin User', 'admin'),
  ('user-001', 'Basic User', 'basic')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_proteins_name ON proteins(name);
CREATE INDEX IF NOT EXISTS idx_fragments_protein_id ON fragments(protein_id);
CREATE INDEX IF NOT EXISTS idx_fragments_sequence ON fragments(sequence);
CREATE INDEX IF NOT EXISTS idx_motifs_fragment_id ON motifs(fragment_id);
CREATE INDEX IF NOT EXISTS idx_motifs_pattern ON motifs(motif_pattern);
-- Add indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_fragments_motifs_data ON fragments USING GIN (motifs_data);
CREATE INDEX IF NOT EXISTS idx_fragments_confidence_scores ON fragments USING GIN (confidence_scores);