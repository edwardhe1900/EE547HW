// src/server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const proteinRoutes = require('./routes/proteinRoutes');
const fragmentRoutes = require('./routes/fragmentRoutes');
const { errorHandler } = require('./utils/errorHandlers');
const db = require('./db');
const { ensureDirectories } = require('./models/proteinRepository');
const fs = require('fs');

// Create Express app
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/proteins', proteinRoutes);
app.use('/api/fragments', fragmentRoutes);

// Main visualization page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Fragment analysis page
app.get('/fragments', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/fragments.html'));
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: "Protein Management and Visualization API",
    version: "1.0.0",
    description: "RESTful API for protein data management, analysis, and visualization",
    endpoints: [
      { method: "GET", path: "/api/proteins", description: "List all proteins with pagination" },
      { method: "GET", path: "/api/proteins/search", description: "Search proteins by various criteria" },
      { method: "GET", path: "/api/proteins/:proteinId", description: "Get a specific protein" },
      { method: "POST", path: "/api/proteins", description: "Create a new protein" },
      { method: "POST", path: "/api/proteins/sequence", description: "Create a protein from plain text sequence" },
      { method: "PUT", path: "/api/proteins/:proteinId", description: "Update a protein" },
      { method: "DELETE", path: "/api/proteins/:proteinId", description: "Delete a protein" },
      { method: "GET", path: "/api/proteins/:proteinId/structure", description: "Get predicted secondary structure" },
      { method: "GET", path: "/api/proteins/:proteinId/sequence", description: "Get protein sequence in FASTA format" },
      { method: "GET", path: "/api/proteins/:proteinId/motifs", description: "Get motifs in a protein" },
      { method: "GET", path: "/api/proteins/:proteinId/fragments", description: "Get protein fragments" },
      { method: "GET", path: "/api/fragments/:fragmentId", description: "Get a specific fragment" },
      { method: "GET", path: "/api/fragments/:fragmentId/visualization", description: "Visualize a specific fragment" }
    ],
    authentication: "All endpoints require X-User-ID header for authentication"
  });
});

// Error handling middleware
app.use(errorHandler);

// Function to initialize the server
async function initializeServer() {
  try {
    // Ensure data directories exist
    ensureDirectories();
    
    // Ensure public directory exists
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Test database connection
    const connected = await db.testConnection();
    
    if (!connected) {
      console.error('Failed to connect to PostgreSQL database. Check your .env configuration.');
      process.exit(1);
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API documentation available at http://localhost:${PORT}/api`);
      console.log(`Main visualization interface at http://localhost:${PORT}/`);
      console.log(`Fragment analysis interface at http://localhost:${PORT}/fragments`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

module.exports = { app, initializeServer };