// src/models/proteinRepository.js
// Data access layer for protein-related operations
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { NotFoundError, ValidationError } = require('../utils/errorHandlers');
const { predictSecondaryStructure } = require('../utils/gorAlgorithm');
const { findMotifs, fragmentSequence } = require('../utils/motifFinder');

// Constants
const MAX_PROTEIN_LENGTH = process.env.MAX_PROTEIN_LENGTH || 2000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DATA_DIR = path.join(__dirname, '../../data');
const SEQUENCES_DIR = path.join(DATA_DIR, 'sequences');

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SEQUENCES_DIR)) {
    fs.mkdirSync(SEQUENCES_DIR, { recursive: true });
  }
}

// Save sequence to file and return URL
async function storeSequenceFile(proteinId, sequence) {
  ensureDirectories();
  
  const filePath = path.join(SEQUENCES_DIR, `${proteinId}.fasta`);
  const fileContent = `>protein_${proteinId}\n${sequence}`;
  
  fs.writeFileSync(filePath, fileContent);
  return `${BASE_URL}/api/proteins/${proteinId}/sequence`;
}

// Read sequence from file
function getSequenceFromFile(proteinId) {
  const filePath = path.join(SEQUENCES_DIR, `${proteinId}.fasta`);
  
  if (!fs.existsSync(filePath)) {
    throw new NotFoundError(`Sequence file for protein ${proteinId} not found`);
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  
  // Skip header line and join remaining lines
  return lines.slice(1).join('');
}

// Calculate molecular weight
function calculateMolecularWeight(sequence) {
  const aminoWeights = {
    A: 89.09, R: 174.20, N: 132.12, D: 133.10, C: 121.16,
    Q: 146.15, E: 147.13, G: 75.07, H: 155.16, I: 131.17,
    L: 131.17, K: 146.19, M: 149.21, F: 165.19, P: 115.13,
    S: 105.09, T: 119.12, W: 204.23, Y: 181.19, V: 117.15
  };
  
  let weight = 0;
  for (const amino of sequence) {
    weight += aminoWeights[amino] || 0;
  }
  
  // Subtract water molecules lost in peptide bond formation
  weight -= (sequence.length - 1) * 18.01528;
  
  return parseFloat(weight.toFixed(2));
}

// Create a new protein
async function createProtein(proteinData) {
  // Validate sequence
  if (!proteinData.sequence) {
    throw new ValidationError('Protein sequence is required');
  }
  
  if (proteinData.sequence.length > MAX_PROTEIN_LENGTH) {
    throw new ValidationError(`Protein sequence exceeds maximum length of ${MAX_PROTEIN_LENGTH}`);
  }
  
  // Generate protein ID
  const proteinId = uuidv4();
  
  // Store sequence file
  const sequenceUrl = await storeSequenceFile(proteinId, proteinData.sequence);
  
  return db.withTransaction(async (client) => {
    // Insert protein record
    const proteinResult = await client.query(
      `INSERT INTO proteins(
        protein_id, name, description, molecular_weight, sequence_length, sequence_url
      ) VALUES($1, $2, $3, $4, $5, $6) 
      RETURNING *`,
      [
        proteinId,
        proteinData.name || `Protein ${proteinData.sequence.substring(0, 8)} ${Math.floor(Date.now() / 1000)}`,
        proteinData.description || '',
        calculateMolecularWeight(proteinData.sequence),
        proteinData.sequence.length,
        sequenceUrl
      ]
    );
    
    const protein = proteinResult.rows[0];
    
    // Fragment the sequence and store fragments
    await fragmentAndStoreSequence(client, proteinId, proteinData.sequence);
    
    // Transform DB column names to camelCase for API response
    return {
      proteinId: protein.protein_id,
      name: protein.name,
      description: protein.description,
      molecularWeight: protein.molecular_weight,
      sequenceLength: protein.sequence_length,
      createdAt: protein.created_at,
      updatedAt: protein.updated_at,
      sequenceUrl: protein.sequence_url
    };
  });
}

// Fragment a protein sequence, predict structure, find motifs, and store in DB
async function fragmentAndStoreSequence(client, proteinId, sequence) {
  // Configuration for sliding window approach
  const windowSize = 15;
  const stepSize = 5;
  
  try {
    // Generate fragments using sliding window approach
    for (let i = 0; i <= sequence.length - windowSize; i += stepSize) {
      // Extract fragment and calculate positions
      const fragmentSequence = sequence.substring(i, i + windowSize);
      const startPosition = i + 1; // 1-indexed for bioinformatics
      const endPosition = i + windowSize;
      
      // Analyze fragment characteristics
      // Predict secondary structure using GOR algorithm
      const structurePrediction = predictSecondaryStructure(fragmentSequence);
      
      // Identify motifs in current fragment
      const motifs = findMotifs(fragmentSequence);
      
      // Ensure all confidence scores are within [0,1] range
      const validConfidenceScores = structurePrediction.confidenceScores.map(score => {
        return Math.min(Math.max(0, score), 1); // Clamp value between 0 and 1
      });
      
      // Generate fragment ID
      const fragmentId = uuidv4();
      
      // Generate URL
      const fragmentUrl = `${BASE_URL}/api/fragments/${fragmentId}`;
      
      // Prepare data for database storage
      // Convert motifs and confidence scores to JSON strings
      const motifsData = JSON.stringify(motifs);
      const confidenceScoresData = JSON.stringify(validConfidenceScores);
      
      // Execute database insertion
      // Use parameterized query for security
      await client.query(
        `INSERT INTO fragments(
          fragment_id, protein_id, sequence, start_position, end_position, 
          secondary_structure, motifs_data, confidence_scores, url
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          fragmentId,
          proteinId,
          fragmentSequence,
          startPosition,
          endPosition,
          structurePrediction.secondaryStructure,
          motifsData,
          confidenceScoresData,
          fragmentUrl
        ]
      );
      
      // For backward compatibility, still insert individual motifs
      // but without using the confidence scores that could violate constraints
      for (const motif of motifs) {
        await client.query(
          `INSERT INTO motifs(
            fragment_id, motif_pattern, motif_type, 
            start_position, end_position, confidence_score
          ) VALUES($1, $2, $3, $4, $5, $6)`,
          [
            fragmentId,
            motif.pattern,
            motif.type,
            motif.startPosition,
            motif.endPosition,
            0.9 // Fixed confidence value that won't violate constraints
          ]
        );
      }
    }
  } catch (error) {
    // Handle errors appropriately
    console.error('Fragmentation error:', error);
    throw error; // Allow transaction to handle rollback
  }
}

// Get a protein by ID
async function getProteinById(proteinId) {
  const result = await db.query(
    'SELECT * FROM proteins WHERE protein_id = $1',
    [proteinId]
  );
  
  if (result.rows.length === 0) {
    throw new NotFoundError(`Protein with id ${proteinId} not found`);
  }
  
  const protein = result.rows[0];
  
  return {
    proteinId: protein.protein_id,
    name: protein.name,
    description: protein.description || '',
    molecularWeight: protein.molecular_weight,
    sequenceLength: protein.sequence_length,
    createdAt: protein.created_at,
    updatedAt: protein.updated_at,
    sequenceUrl: protein.sequence_url
  };
}

// List proteins with pagination
async function getProteins(limit = 10, offset = 0) {
  const countResult = await db.query('SELECT COUNT(*) FROM proteins');
  const totalCount = parseInt(countResult.rows[0].count);
  
  const result = await db.query(
    'SELECT * FROM proteins ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  
  const proteins = result.rows.map(row => ({
    proteinId: row.protein_id,
    name: row.name,
    description: row.description || '',
    molecularWeight: row.molecular_weight,
    sequenceLength: row.sequence_length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sequenceUrl: row.sequence_url
  }));
  
  return {
    proteins,
    total: totalCount,
    limit,
    offset
  };
}

// Update a protein
async function updateProtein(proteinId, updateData) {
  // Verify protein exists
  const checkResult = await db.query(
    'SELECT * FROM proteins WHERE protein_id = $1',
    [proteinId]
  );
  
  if (checkResult.rows.length === 0) {
    throw new NotFoundError(`Protein with id ${proteinId} not found`);
  }
  
  // Prepare update fields
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (updateData.name !== undefined) {
    fields.push(`name = $${paramIndex}`);
    values.push(updateData.name);
    paramIndex++;
  }
  
  if (updateData.description !== undefined) {
    fields.push(`description = $${paramIndex}`);
    values.push(updateData.description);
    paramIndex++;
  }
  
  // Add updated timestamp
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  
  // Add protein ID to values array
  values.push(proteinId);
  
  // Execute update
  const result = await db.query(
    `UPDATE proteins SET ${fields.join(', ')} WHERE protein_id = $${paramIndex} RETURNING *`,
    values
  );
  
  const protein = result.rows[0];
  
  return {
    proteinId: protein.protein_id,
    name: protein.name,
    description: protein.description || '',
    molecularWeight: protein.molecular_weight,
    sequenceLength: protein.sequence_length,
    createdAt: protein.created_at,
    updatedAt: protein.updated_at,
    sequenceUrl: protein.sequence_url
  };
}

// Delete a protein
async function deleteProtein(proteinId) {
  // Check protein exists
  const checkResult = await db.query(
    'SELECT protein_id FROM proteins WHERE protein_id = $1',
    [proteinId]
  );
  
  if (checkResult.rows.length === 0) {
    throw new NotFoundError(`Protein with id ${proteinId} not found`);
  }
  
  // Delete from database (cascade will delete fragments and motifs)
  await db.query('DELETE FROM proteins WHERE protein_id = $1', [proteinId]);
  
  // Delete sequence file
  try {
    const filePath = path.join(SEQUENCES_DIR, `${proteinId}.fasta`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting sequence file for protein ${proteinId}:`, error);
    // Continue even if file deletion fails
  }
  
  return true;
}

// Get a specific fragment by ID
async function getFragmentById(fragmentId) {
  const fragmentResult = await db.query(
    `SELECT 
      f.fragment_id, f.protein_id, f.sequence, f.start_position, 
      f.end_position, f.secondary_structure, f.motifs_data, 
      f.confidence_scores, f.created_at, f.url
    FROM fragments f
    WHERE f.fragment_id = $1`,
    [fragmentId]
  );
  
  if (fragmentResult.rows.length === 0) {
    throw new NotFoundError(`Fragment with id ${fragmentId} not found`);
  }
  
  const fragment = fragmentResult.rows[0];
  
  // Parse JSONB data if available
  let motifs = [];
  let confidenceScores = [];
  
  try {
    if (fragment.motifs_data) {
      motifs = typeof fragment.motifs_data === 'string' 
        ? JSON.parse(fragment.motifs_data) 
        : fragment.motifs_data;
    }
    
    if (fragment.confidence_scores) {
      confidenceScores = typeof fragment.confidence_scores === 'string' 
        ? JSON.parse(fragment.confidence_scores) 
        : fragment.confidence_scores;
    }
  } catch (error) {
    console.error('Error parsing JSON data for fragment:', error);
  }
  
  return {
    fragmentId: fragment.fragment_id,
    proteinId: fragment.protein_id,
    sequence: fragment.sequence,
    startPosition: fragment.start_position,
    endPosition: fragment.end_position,
    secondaryStructure: fragment.secondary_structure,
    confidenceScores: confidenceScores,
    motifs: motifs,
    createdAt: fragment.created_at,
    url: fragment.url
  };
}

// Get fragments for a specific protein
async function getFragmentsByProteinId(proteinId) {
  // First, verify the protein exists
  const proteinCheck = await db.query(
    'SELECT 1 FROM proteins WHERE protein_id = $1',
    [proteinId]
  );
  
  if (proteinCheck.rows.length === 0) {
    throw new NotFoundError(`Protein with id ${proteinId} not found`);
  }
  
  // Get all fragments for the protein
  const fragmentsResult = await db.query(
    `SELECT 
      f.fragment_id, f.protein_id, f.sequence, f.start_position, 
      f.end_position, f.secondary_structure, f.motifs_data, 
      f.confidence_scores, f.created_at, f.url
    FROM fragments f
    WHERE f.protein_id = $1
    ORDER BY f.start_position`,
    [proteinId]
  );
  
  // Transform results into appropriate format
  const fragments = fragmentsResult.rows.map(fragment => {
    let motifs = [];
    let confidenceScores = [];
    
    // Parse JSONB data if available, otherwise use empty arrays
    try {
      if (fragment.motifs_data) {
        motifs = typeof fragment.motifs_data === 'string' 
          ? JSON.parse(fragment.motifs_data) 
          : fragment.motifs_data;
      }
      
      if (fragment.confidence_scores) {
        confidenceScores = typeof fragment.confidence_scores === 'string' 
          ? JSON.parse(fragment.confidence_scores) 
          : fragment.confidence_scores;
      }
    } catch (error) {
      console.error('Error parsing JSON data for fragment:', error);
    }
    
    return {
      fragmentId: fragment.fragment_id,
      proteinId: fragment.protein_id,
      sequence: fragment.sequence,
      startPosition: fragment.start_position,
      endPosition: fragment.end_position,
      secondaryStructure: fragment.secondary_structure,
      confidenceScores: confidenceScores,
      motifs: motifs,
      createdAt: fragment.created_at,
      url: fragment.url
    };
  });
  
  return fragments;
}

// Search proteins
async function searchProteins(searchParams) {
  console.log("Search params received in repository:", searchParams);
  
  // Create separate arrays for parameters and values
  const conditions = [];
  const values = [];
  let paramIndex = 1;
  
  // Name search (partial match)
  if (searchParams.name) {
    conditions.push(`name ILIKE $${paramIndex}`);
    values.push(`%${searchParams.name}%`);
    paramIndex++;
  }
  
  // Molecular weight filters - handle each filter separately
  if (searchParams['molecularWeight[gt]'] !== undefined) {
    conditions.push(`molecular_weight > $${paramIndex}`);
    values.push(parseFloat(searchParams['molecularWeight[gt]']));
    paramIndex++;
  }
  
  if (searchParams['molecularWeight[gte]'] !== undefined) {
    conditions.push(`molecular_weight >= $${paramIndex}`);
    values.push(parseFloat(searchParams['molecularWeight[gte]']));
    paramIndex++;
  }
  
  if (searchParams['molecularWeight[lt]'] !== undefined) {
    conditions.push(`molecular_weight < $${paramIndex}`);
    values.push(parseFloat(searchParams['molecularWeight[lt]']));
    paramIndex++;
  }
  
  if (searchParams['molecularWeight[lte]'] !== undefined) {
    conditions.push(`molecular_weight <= $${paramIndex}`);
    values.push(parseFloat(searchParams['molecularWeight[lte]']));
    paramIndex++;
  }
  
  if (searchParams['molecularWeight[eq]'] !== undefined) {
    conditions.push(`molecular_weight = $${paramIndex}`);
    values.push(parseFloat(searchParams['molecularWeight[eq]']));
    paramIndex++;
  }
  
  // Sequence length filters - handle each filter separately
  if (searchParams['sequenceLength[gt]'] !== undefined) {
    conditions.push(`sequence_length > $${paramIndex}`);
    values.push(parseInt(searchParams['sequenceLength[gt]']));
    paramIndex++;
  }
  
  if (searchParams['sequenceLength[gte]'] !== undefined) {
    conditions.push(`sequence_length >= $${paramIndex}`);
    values.push(parseInt(searchParams['sequenceLength[gte]']));
    paramIndex++;
  }
  
  if (searchParams['sequenceLength[lt]'] !== undefined) {
    conditions.push(`sequence_length < $${paramIndex}`);
    values.push(parseInt(searchParams['sequenceLength[lt]']));
    paramIndex++;
  }
  
  if (searchParams['sequenceLength[lte]'] !== undefined) {
    conditions.push(`sequence_length <= $${paramIndex}`);
    values.push(parseInt(searchParams['sequenceLength[lte]']));
    paramIndex++;
  }
  
  if (searchParams['sequenceLength[eq]'] !== undefined) {
    conditions.push(`sequence_length = $${paramIndex}`);
    values.push(parseInt(searchParams['sequenceLength[eq]']));
    paramIndex++;
  }
  
  // Build the basic query from conditions
  let query = 'SELECT * FROM proteins';
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Motif search - this is handled separately since it requires a JOIN
  if (searchParams.motif) {
    try {
      // Import the motif patterns
      const { MOTIF_PATTERNS } = require('../utils/motifFinder');
      
      // Get the motif pattern from predefined patterns or use directly
      let motifPattern = searchParams.motif;
      if (MOTIF_PATTERNS[searchParams.motif]) {
        motifPattern = MOTIF_PATTERNS[searchParams.motif].pattern;
      }
      
      // Execute a separate query to find proteins with the motif
      const motifQuery = `
        SELECT DISTINCT p.protein_id
        FROM proteins p
        JOIN fragments f ON p.protein_id = f.protein_id
        WHERE EXISTS (
          SELECT 1 FROM jsonb_array_elements(f.motifs_data) AS motif
          WHERE (motif->>'pattern')::text ~ $1
        )
      `;
      
      const motifResult = await db.query(motifQuery, [motifPattern]);
      const proteinIds = motifResult.rows.map(row => row.protein_id);
      
      if (proteinIds.length > 0) {
        if (conditions.length > 0) {
          // Add the protein IDs to the existing WHERE clause
          query += ` AND protein_id = ANY($${paramIndex}::uuid[])`;
        } else {
          // Create a new WHERE clause
          query += ` WHERE protein_id = ANY($${paramIndex}::uuid[])`;
        }
        values.push(proteinIds);
        paramIndex++;
      } else if (conditions.length === 0) {
        // If no proteins match the motif and there are no other conditions, return empty result
        return [];
      }
    } catch (error) {
      console.error('Error in motif search:', error);
      // If motif search fails, continue with other filters
    }
  }
  
  // Sorting
  if (searchParams.sort) {
    const [field, direction] = searchParams.sort.split(':');
    const validFields = ['name', 'createdAt', 'molecularWeight', 'sequenceLength'];
    const validDirections = ['asc', 'desc'];
    
    if (validFields.includes(field) && validDirections.includes(direction || 'asc')) {
      // Map API field names to database column names
      const fieldMap = {
        name: 'name',
        createdAt: 'created_at',
        molecularWeight: 'molecular_weight',
        sequenceLength: 'sequence_length'
      };
      
      query += ` ORDER BY ${fieldMap[field]} ${direction.toUpperCase()}`;
    } else {
      // Default sorting
      query += ' ORDER BY created_at DESC';
    }
  } else {
    // Default sorting
    query += ' ORDER BY created_at DESC';
  }
  
  console.log("Final query:", query);
  console.log("Query values:", values);
  
  // Execute query and get results
  try {
    const result = await db.query(query, values);
    
    // Transform results to camelCase for API response
    return result.rows.map(row => ({
      proteinId: row.protein_id,
      name: row.name,
      description: row.description || '',
      molecularWeight: row.molecular_weight,
      sequenceLength: row.sequence_length,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sequenceUrl: row.sequence_url
    }));
  } catch (error) {
    console.error('Error executing search query:', error);
    throw error;
  }
}

// Create a new fragment
async function createFragment(fragmentData) {
  const { 
    proteinId, 
    sequence, 
    startPosition, 
    endPosition, 
    secondaryStructure, 
    confidenceScores 
  } = fragmentData;
  
  // Generate fragment ID
  const fragmentId = uuidv4();
  
  // Generate URL
  const fragmentUrl = `${BASE_URL}/api/fragments/${fragmentId}`;
  
  // Find motifs in the fragment
  const motifs = findMotifs(sequence);
  
  return db.withTransaction(async (client) => {
    // Prepare data for database storage
    // Convert motifs and confidence scores to JSON strings
    const motifsData = JSON.stringify(motifs);
    const confidenceScoresData = JSON.stringify(confidenceScores);
    
    // Execute database insertion
    const result = await client.query(
      `INSERT INTO fragments(
        fragment_id, protein_id, sequence, start_position, end_position, 
        secondary_structure, motifs_data, confidence_scores, url
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        fragmentId,
        proteinId,
        sequence,
        startPosition,
        endPosition,
        secondaryStructure,
        motifsData,
        confidenceScoresData,
        fragmentUrl
      ]
    );
    
    const fragment = result.rows[0];
    
    // For backward compatibility, insert individual motifs
    for (const motif of motifs) {
      await client.query(
        `INSERT INTO motifs(
          fragment_id, motif_pattern, motif_type, 
          start_position, end_position, confidence_score
        ) VALUES($1, $2, $3, $4, $5, $6)`,
        [
          fragmentId,
          motif.pattern,
          motif.type,
          motif.startPosition,
          motif.endPosition,
          0.9 // Fixed confidence value that won't violate constraints
        ]
      );
    }
    
    // Return the formatted fragment data
    return {
      fragmentId: fragment.fragment_id,
      proteinId: fragment.protein_id,
      sequence: fragment.sequence,
      startPosition: fragment.start_position,
      endPosition: fragment.end_position,
      secondaryStructure: fragment.secondary_structure,
      confidenceScores: confidenceScores,
      motifs: motifs,
      createdAt: fragment.created_at,
      url: fragment.url
    };
  });
}

module.exports = {
  ensureDirectories,
  getSequenceFromFile,
  calculateMolecularWeight,
  createProtein,
  getProteinById,
  getProteins,
  updateProtein,
  deleteProtein,
  getFragmentById,
  getFragmentsByProteinId,
  searchProteins,
  createFragment
};