// src/utils/motifFinder.js
// Functionality for finding motifs in protein sequences

// Predefined motif patterns
const MOTIF_PATTERNS = {
    'N-glycosylation': {
      pattern: 'N[^P][ST][^P]',
      description: 'N-glycosylation site'
    },
    'Casein_kinase_II_phosphorylation': {
      pattern: '[ST].{2}[DE]',
      description: 'Casein kinase II phosphorylation site'
    },
    'Tyrosine_kinase_phosphorylation': {
      pattern: '[RK].{0,2}[DE]',
      description: 'Tyrosine kinase phosphorylation site'
    }
  };
  
  /**
   * Find motifs in a protein sequence
   * @param {string} sequence - The amino acid sequence to search
   * @param {string} motifPattern - Optional specific motif pattern to search for
   * @returns {Array} Array of detected motifs with position information
   */
  function findMotifs(sequence, motifPattern = null) {
    const motifs = [];
    
    // If a specific motif pattern is provided, search for it
    if (motifPattern) {
      try {
        const regex = new RegExp(motifPattern, 'g');
        let match;
        
        while ((match = regex.exec(sequence)) !== null) {
          motifs.push({
            pattern: match[0],
            type: 'Custom',
            description: 'Custom motif pattern',
            startPosition: match.index + 1, // 1-indexed for bioinformatics
            endPosition: match.index + match[0].length
          });
        }
        
        return motifs;
      } catch (error) {
        console.error('Invalid regex pattern:', error);
        return [];
      }
    }
    
    // Otherwise search for all predefined motifs
    for (const [motifName, motifInfo] of Object.entries(MOTIF_PATTERNS)) {
      const regex = new RegExp(motifInfo.pattern, 'g');
      let match;
      
      while ((match = regex.exec(sequence)) !== null) {
        motifs.push({
          pattern: match[0],
          type: motifName,
          description: motifInfo.description,
          startPosition: match.index + 1, // 1-indexed for bioinformatics
          endPosition: match.index + match[0].length
        });
      }
    }
    
    return motifs;
  }
  
  /**
   * Fragment a protein sequence using sliding window approach
   * @param {string} sequence - The full protein sequence
   * @param {number} windowSize - Size of each fragment window (default: 15)
   * @param {number} stepSize - Step size between windows (default: 5)
   * @returns {Array} Array of sequence fragments with position information
   */
  function fragmentSequence(sequence, windowSize = 15, stepSize = 5) {
    const fragments = [];
    
    for (let i = 0; i <= sequence.length - windowSize; i += stepSize) {
      const fragment = sequence.substring(i, i + windowSize);
      fragments.push({
        sequence: fragment,
        startPosition: i + 1, // 1-indexed for bioinformatics
        endPosition: i + windowSize
      });
    }
    
    return fragments;
  }
  
  module.exports = {
    findMotifs,
    fragmentSequence,
    MOTIF_PATTERNS
  };