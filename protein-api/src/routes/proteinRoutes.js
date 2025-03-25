// src/routes/proteinRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const proteinRepo = require('../models/proteinRepository');
const { NotFoundError, ValidationError } = require('../utils/errorHandlers');

// Authentication middleware for all protein routes
router.use(authenticateUser);

// GET /api/proteins - List all proteins with pagination
router.get('/', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await proteinRepo.getProteins(limit, offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/proteins/search - Search proteins with various criteria
router.get('/search', async (req, res, next) => {
  try {
    console.log("Search query params:", req.query);
    
    const searchParams = {};
    
    // Process name search
    if (req.query.name) {
      searchParams.name = req.query.name;
    }
    
    // Process molecular weight filters with simpler parameter names
    const molecularWeightMap = {
      molecularWeightGt: 'molecularWeight[gt]',
      molecularWeightGte: 'molecularWeight[gte]',
      molecularWeightLt: 'molecularWeight[lt]',
      molecularWeightLte: 'molecularWeight[lte]',
      molecularWeightEq: 'molecularWeight[eq]'
    };
    
    for (const [paramName, internalName] of Object.entries(molecularWeightMap)) {
      if (req.query[paramName] !== undefined) {
        const value = parseFloat(req.query[paramName]);
        if (!isNaN(value)) {
          searchParams[internalName] = value;
        } else {
          throw new ValidationError(`Invalid value for ${paramName}`);
        }
      }
    }
    
    // Process sequence length filters with simpler parameter names
    const sequenceLengthMap = {
      sequenceLengthGt: 'sequenceLength[gt]',
      sequenceLengthGte: 'sequenceLength[gte]',
      sequenceLengthLt: 'sequenceLength[lt]',
      sequenceLengthLte: 'sequenceLength[lte]',
      sequenceLengthEq: 'sequenceLength[eq]'
    };
    
    for (const [paramName, internalName] of Object.entries(sequenceLengthMap)) {
      if (req.query[paramName] !== undefined) {
        const value = parseInt(req.query[paramName]);
        if (!isNaN(value)) {
          searchParams[internalName] = value;
        } else {
          throw new ValidationError(`Invalid value for ${paramName}`);
        }
      }
    }
    
    // Maintain backward compatibility with bracket notation
    const molecularWeightParams = ['molecularWeight[gt]', 'molecularWeight[gte]', 'molecularWeight[lt]', 'molecularWeight[lte]', 'molecularWeight[eq]'];
    
    for (const param of molecularWeightParams) {
      if (req.query[param] !== undefined) {
        const value = parseFloat(req.query[param]);
        if (!isNaN(value)) {
          searchParams[param] = value;
        } else {
          throw new ValidationError(`Invalid value for ${param}`);
        }
      }
    }
    
    const sequenceLengthParams = ['sequenceLength[gt]', 'sequenceLength[gte]', 'sequenceLength[lt]', 'sequenceLength[lte]', 'sequenceLength[eq]'];
    
    for (const param of sequenceLengthParams) {
      if (req.query[param] !== undefined) {
        const value = parseInt(req.query[param]);
        if (!isNaN(value)) {
          searchParams[param] = value;
        } else {
          throw new ValidationError(`Invalid value for ${param}`);
        }
      }
    }
    
    // Process motif search
    if (req.query.motif) {
      searchParams.motif = req.query.motif;
    }
    
    // Process sorting
    if (req.query.sort) {
      searchParams.sort = req.query.sort;
    }
    
    console.log("Processed search params:", searchParams);
    
    const results = await proteinRepo.searchProteins(searchParams);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// GET /api/proteins/:proteinId - Get a specific protein
router.get('/:proteinId', async (req, res, next) => {
  try {
    const { proteinId } = req.params;
    
    try {
      const protein = await proteinRepo.getProteinById(proteinId);
      res.json(protein);
    } catch (error) {
      throw new NotFoundError(`Protein with id ${proteinId} not found`);
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/proteins - Create a new protein
router.post('/', async (req, res, next) => {
  try {
    const { sequence, name, description } = req.body;
    
    if (!sequence) {
      throw new ValidationError('Protein sequence is required');
    }
    
    const MAX_PROTEIN_LENGTH = process.env.MAX_PROTEIN_LENGTH || 2000;
    if (sequence.length > MAX_PROTEIN_LENGTH) {
      throw new ValidationError(`Protein sequence exceeds maximum length of ${MAX_PROTEIN_LENGTH}`);
    }
    
    const proteinData = {
      sequence: sequence.toUpperCase(),
      name,
      description
    };
    
    const newProtein = await proteinRepo.createProtein(proteinData);
    res.status(201).json(newProtein);
  } catch (error) {
    next(error);
  }
});

// POST /api/proteins/sequence - Create protein from raw sequence
router.post('/sequence', async (req, res, next) => {
  try {
    // Get the plain text sequence from the request body
    const sequence = req.body.toString().trim();
    
    if (!sequence) {
      throw new ValidationError('Protein sequence is required');
    }
    
    const MAX_PROTEIN_LENGTH = process.env.MAX_PROTEIN_LENGTH || 2000;
    if (sequence.length > MAX_PROTEIN_LENGTH) {
      throw new ValidationError(`Protein sequence exceeds maximum length of ${MAX_PROTEIN_LENGTH}`);
    }
    
    const proteinData = {
      sequence: sequence.toUpperCase()
    };
    
    const newProtein = await proteinRepo.createProtein(proteinData);
    res.status(201).json(newProtein);
  } catch (error) {
    next(error);
  }
});

// PUT /api/proteins/:proteinId - Update a protein
router.put('/:proteinId', async (req, res, next) => {
  try {
    const { proteinId } = req.params;
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name) {
      throw new ValidationError('Protein name is required');
    }
    
    // Update the protein
    try {
      const updatedProtein = await proteinRepo.updateProtein(proteinId, { name, description });
      res.json(updatedProtein);
    } catch (error) {
      throw new NotFoundError(`Protein with id ${proteinId} not found`);
    }
  } catch (error) {
    next(error);
  }
});

// DELETE /api/proteins/:proteinId - Delete a protein
router.delete('/:proteinId', async (req, res, next) => {
  try {
    const { proteinId } = req.params;
    
    try {
      const result = await proteinRepo.deleteProtein(proteinId);
      res.json(result);
    } catch (error) {
      throw new NotFoundError(`Protein with id ${proteinId} not found`);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/proteins/:proteinId/structure - Get protein secondary structure
router.get('/:proteinId/structure', async (req, res, next) => {
  try {
    const { proteinId } = req.params;
    
    try {
      // Get the protein sequence
      const sequence = proteinRepo.getSequenceFromFile(proteinId);
      
      // Use the GOR algorithm to predict the structure
      const { predictSecondaryStructure } = require('../utils/gorAlgorithm');
      const prediction = predictSecondaryStructure(sequence);
      
      res.json({
        proteinId,
        sequence,
        secondaryStructure: prediction.secondaryStructure,
        confidenceScores: prediction.confidenceScores
      });
    } catch (error) {
      throw new NotFoundError(`Protein with id ${proteinId} not found`);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/proteins/:proteinId/sequence - Get protein sequence in FASTA format
router.get('/:proteinId/sequence', async (req, res, next) => {
  try {
    const { proteinId } = req.params;
    
    try {
      // Get the protein from database
      const protein = await proteinRepo.getProteinById(proteinId);
      
      // Read the sequence file
      const filePath = require('path').join(
        __dirname, 
        '../../data/sequences', 
        `${proteinId}.fasta`
      );
      const fs = require('fs');
      
      if (fs.existsSync(filePath)) {
        const sequence = fs.readFileSync(filePath, 'utf8');
        // Return as text/plain with FASTA format
        res.setHeader('Content-Type', 'text/plain');
        res.send(sequence);
      } else {
        throw new Error('Sequence file not found');
      }
    } catch (error) {
      throw new NotFoundError(`Protein with id ${proteinId} not found`);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/proteins/:proteinId/fragments - Get protein fragments
router.get('/:proteinId/fragments', async (req, res, next) => {
  try {
    const { proteinId } = req.params;
    
    try {
      const fragments = await proteinRepo.getFragmentsByProteinId(proteinId);
      res.json(fragments);
    } catch (error) {
      throw new NotFoundError(`Protein with id ${proteinId} not found`);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;