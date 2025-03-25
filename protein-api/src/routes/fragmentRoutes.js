// src/routes/fragmentRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const proteinRepo = require('../models/proteinRepository');
const { NotFoundError, ValidationError } = require('../utils/errorHandlers');

// Authentication middleware for all fragment routes
router.use(authenticateUser);

// GET /api/fragments/:fragmentId - Get a specific fragment
router.get('/:fragmentId', async (req, res, next) => {
  try {
    const { fragmentId } = req.params;
    
    try {
      const fragment = await proteinRepo.getFragmentById(fragmentId);
      res.json(fragment);
    } catch (error) {
      throw new NotFoundError(`Fragment with id ${fragmentId} not found`);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/fragments/:fragmentId/visualization - Visualize a specific fragment
router.get('/:fragmentId/visualization', async (req, res, next) => {
  try {
    const { fragmentId } = req.params;
    
    try {
      const fragment = await proteinRepo.getFragmentById(fragmentId);
      
      // Get the fragment's secondary structure and confidence scores
      const visualization = {
        fragmentId: fragment.fragmentId,
        sequence: fragment.sequence,
        secondaryStructure: fragment.secondaryStructure,
        confidenceScores: fragment.confidenceScores,
        startPosition: fragment.startPosition,
        endPosition: fragment.endPosition,
        motifs: fragment.motifs,
        visualization: {
          helices: [], // Regions with H structure
          strands: [], // Regions with E structure
          coils: []    // Regions with C structure
        }
      };
      
      // Process the secondary structure to identify continuous regions
      let currentType = '';
      let startPos = 0;
      
      for (let i = 0; i < fragment.secondaryStructure.length; i++) {
        const structureType = fragment.secondaryStructure[i];
        
        if (structureType !== currentType) {
          // If we had a previous structure segment, add it to the appropriate array
          if (currentType && i > 0) {
            const region = {
              start: startPos,
              end: i - 1,
              confidenceScores: fragment.confidenceScores.slice(startPos, i)
            };
            
            if (currentType === 'H') {
              visualization.visualization.helices.push(region);
            } else if (currentType === 'E') {
              visualization.visualization.strands.push(region);
            } else if (currentType === 'C') {
              visualization.visualization.coils.push(region);
            }
          }
          
          // Start a new segment
          currentType = structureType;
          startPos = i;
        }
      }
      
      // Add the final segment
      if (currentType) {
        const region = {
          start: startPos,
          end: fragment.secondaryStructure.length - 1,
          confidenceScores: fragment.confidenceScores.slice(startPos)
        };
        
        if (currentType === 'H') {
          visualization.visualization.helices.push(region);
        } else if (currentType === 'E') {
          visualization.visualization.strands.push(region);
        } else if (currentType === 'C') {
          visualization.visualization.coils.push(region);
        }
      }
      
      res.json(visualization);
    } catch (error) {
      throw new NotFoundError(`Fragment with id ${fragmentId} not found`);
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/fragments - Create a new fragment
router.post('/', async (req, res, next) => {
  try {
    const { 
      proteinId, 
      sequence, 
      startPosition, 
      endPosition, 
      secondaryStructure, 
      confidenceScores 
    } = req.body;
    
    // Validate required fields
    if (!proteinId || !sequence || !startPosition || !endPosition || !secondaryStructure || !confidenceScores) {
      throw new ValidationError('Missing required fields for fragment creation');
    }
    
    // Validate that the protein exists
    try {
      await proteinRepo.getProteinById(proteinId);
    } catch (error) {
      throw new NotFoundError(`Protein with id ${proteinId} not found`);
    }
    
    // Validate sequence and secondary structure length match
    if (sequence.length !== secondaryStructure.length) {
      throw new ValidationError('Sequence and secondary structure must be the same length');
    }
    
    // Validate confidence scores match the sequence length
    if (sequence.length !== confidenceScores.length) {
      throw new ValidationError('Confidence scores must match the sequence length');
    }
    
    // Create the fragment
    const fragment = await proteinRepo.createFragment({
      proteinId,
      sequence,
      startPosition,
      endPosition,
      secondaryStructure,
      confidenceScores
    });
    
    res.status(201).json(fragment);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 