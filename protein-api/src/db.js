const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Create and export connection pool
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD
});

// Test the database connection
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('PostgreSQL connection successful. Server time:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    return false;
  }
}

// Execute a function within a transaction
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Initialize the database
async function initializeDatabase() {
  let client;
  try {
    // Connect to database
    client = await pool.connect();
    console.log('Connected to PostgreSQL');
    
    // Initialize tables
    await client.query(`
      -- Create proteins table
      CREATE TABLE IF NOT EXISTS proteins (
        protein_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        molecular_weight FLOAT NOT NULL,
        sequence_length INTEGER NOT NULL,
        sequence_url VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create fragments table
      CREATE TABLE IF NOT EXISTS fragments (
        fragment_id VARCHAR(50) PRIMARY KEY,
        protein_id VARCHAR(50) REFERENCES proteins(protein_id) ON DELETE CASCADE,
        sequence VARCHAR(255) NOT NULL,
        start_position INTEGER NOT NULL,
        end_position INTEGER NOT NULL,
        secondary_structure VARCHAR(255),
        url VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create motifs table
      CREATE TABLE IF NOT EXISTS motifs (
        motif_id SERIAL PRIMARY KEY,
        fragment_id VARCHAR(50) REFERENCES fragments(fragment_id) ON DELETE CASCADE,
        motif_pattern VARCHAR(255) NOT NULL,
        motif_type VARCHAR(255),
        start_position INTEGER NOT NULL,
        end_position INTEGER NOT NULL,
        confidence_score FLOAT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_fragments_protein_id ON fragments(protein_id);
      CREATE INDEX IF NOT EXISTS idx_motifs_fragment_id ON motifs(fragment_id);
      CREATE INDEX IF NOT EXISTS idx_proteins_name ON proteins(name);
    `);
    
    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  testConnection,
  initializeDatabase,
  withTransaction
};