// scripts/setupDatabase.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function setupDatabase() {
  // Create a new pool for the setup script
  const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD
  });

  try {
    console.log('Setting up database schema...');
    
    // Read schema SQL file
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema SQL
    await pool.query(schemaSql);
    
    console.log('Database schema setup completed successfully');
    console.log('The following tables were created:');
    console.log('- proteins: Stores protein metadata');
    console.log('- fragments: Stores protein fragments');
    console.log('- motifs: Stores motifs and confidence scores');
    console.log('- users: Stores user information for authentication');
    
    console.log('\nDefault users created:');
    console.log('- admin-user-001 (admin role)');
    console.log('- user-001 (basic role)');
    
    console.log('\nUse these user IDs in the X-User-ID header for authentication');
  } catch (error) {
    console.error('Error setting up database schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase();