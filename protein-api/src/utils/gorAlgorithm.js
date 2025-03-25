// src/utils/gorAlgorithm.js
// GOR Algorithm for secondary structure prediction

// Propensity values for each amino acid and secondary structure type
const PROPENSITY_TABLE = {
  'A': { alpha: 1.42, beta: 0.83, coil: 0.80 },
  'R': { alpha: 1.21, beta: 0.84, coil: 0.96 },
  'N': { alpha: 0.67, beta: 0.89, coil: 1.34 },
  'D': { alpha: 1.01, beta: 0.54, coil: 1.35 },
  'C': { alpha: 0.70, beta: 1.19, coil: 1.06 },
  'Q': { alpha: 1.11, beta: 1.10, coil: 0.84 },
  'E': { alpha: 1.51, beta: 0.37, coil: 1.08 },
  'G': { alpha: 0.57, beta: 0.75, coil: 1.56 },
  'H': { alpha: 1.00, beta: 0.87, coil: 1.09 },
  'I': { alpha: 1.08, beta: 1.60, coil: 0.47 },
  'L': { alpha: 1.21, beta: 1.30, coil: 0.59 },
  'K': { alpha: 1.16, beta: 0.74, coil: 1.07 },
  'M': { alpha: 1.45, beta: 1.05, coil: 0.60 },
  'F': { alpha: 1.13, beta: 1.38, coil: 0.59 },
  'P': { alpha: 0.57, beta: 0.55, coil: 1.72 },
  'S': { alpha: 0.77, beta: 0.75, coil: 1.39 },
  'T': { alpha: 0.83, beta: 1.19, coil: 0.96 },
  'W': { alpha: 1.08, beta: 1.37, coil: 0.64 },
  'Y': { alpha: 0.69, beta: 1.47, coil: 0.87 },
  'V': { alpha: 1.06, beta: 1.70, coil: 0.41 }
};

// Predict secondary structure using the GOR algorithm
function predictSecondaryStructure(sequence) {
  const secondaryStructure = [];
  const confidenceScores = [];
  
  for (let i = 0; i < sequence.length; i++) {
    const aa = sequence[i];
    
    // Skip if amino acid not found in propensity table
    if (!PROPENSITY_TABLE[aa]) {
      secondaryStructure.push('C'); // Default to coil
      confidenceScores.push(0);
      continue;
    }
    
    // Get propensities
    const propensities = PROPENSITY_TABLE[aa];
    
    // Find the structure with highest propensity
    const structures = [
      { type: 'H', value: propensities.alpha },
      { type: 'E', value: propensities.beta },
      { type: 'C', value: propensities.coil }
    ];
    
    // Sort by propensity value in descending order
    structures.sort((a, b) => b.value - a.value);
    
    // Assign structure type with highest propensity
    secondaryStructure.push(structures[0].type);
    
    // Calculate confidence score as the difference between the two highest propensities
    const confidence = structures[0].value - structures[1].value;
    confidenceScores.push(parseFloat(confidence.toFixed(2)));
  }
  
  return {
    sequence: sequence,
    secondaryStructure: secondaryStructure.join(''),
    confidenceScores: confidenceScores,
    statistics: {
      helix: (secondaryStructure.filter(s => s === 'H').length / sequence.length).toFixed(2),
      sheet: (secondaryStructure.filter(s => s === 'E').length / sequence.length).toFixed(2),
      coil: (secondaryStructure.filter(s => s === 'C').length / sequence.length).toFixed(2)
    }
  };
}

module.exports = {
  predictSecondaryStructure
};