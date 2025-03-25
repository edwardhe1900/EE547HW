// src/utils/visualization.js
// Utilities for generating visualizations of protein structures

/**
 * Generates an SVG visualization of a protein's secondary structure
 * @param {string} sequence - The amino acid sequence
 * @param {string} secondaryStructure - The predicted secondary structure (H, E, C characters)
 * @param {Array} confidenceScores - Optional array of confidence scores for each position
 * @param {Array} motifs - Optional array of detected motifs
 * @returns {string} SVG markup for the visualization
 */
function generateStructureSVG(sequence, secondaryStructure, confidenceScores = null, motifs = null) {
    // Calculate dimensions
    const svgWidth = Math.max(1000, sequence.length * 10 + 200); // Min width of 1000px
    const svgHeight = motifs ? 200 : 150; // Extra height if showing motifs
    
    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add title
    svg += `<text x="10" y="20" font-size="16" font-weight="bold">Protein Secondary Structure</text>`;
    svg += `<text x="10" y="40" font-size="12">Length: ${sequence.length} amino acids</text>`;
    
    // Define colors
    const colors = {
      H: 'rgb(240, 128, 128)', // Light red for alpha helix
      E: 'rgb(255, 255, 150)', // Light yellow for beta sheet
      C: 'rgb(200, 200, 200)'  // Light gray for coil
    };
    
    // Draw structure blocks
    const blockWidth = Math.min(10, svgWidth / sequence.length);
    const blockHeight = 30;
    const yPos = 60;
    
    for (let i = 0; i < sequence.length; i++) {
      const x = i * blockWidth;
      let color = colors[secondaryStructure[i]] || colors.C;
      
      // Adjust opacity based on confidence if available
      let opacity = 1;
      if (confidenceScores && i < confidenceScores.length) {
        opacity = 0.3 + (confidenceScores[i] * 0.7); // Scale from 0.3 to 1.0
      }
      
      // Draw rectangle for structure
      svg += `<rect x="${x}" y="${yPos}" width="${blockWidth}" height="${blockHeight}" 
        fill="${color}" fill-opacity="${opacity}" stroke="#ccc" stroke-width="0.2" />`;
      
      // Add amino acid label for small sequences or at intervals
      if (sequence.length <= 100 || i % 10 === 0) {
        svg += `<text x="${x + blockWidth/2}" y="${yPos + blockHeight + 15}" 
          font-size="10" text-anchor="middle">${sequence[i]}</text>`;
      }
    }
    
    // Add position markers
    for (let i = 0; i <= sequence.length; i += 10) {
      if (i < sequence.length) {
        const x = i * blockWidth;
        svg += `<line x1="${x}" y1="${yPos + blockHeight + 20}" x2="${x}" y2="${yPos + blockHeight + 25}" 
          stroke="black" stroke-width="1" />`;
        svg += `<text x="${x}" y="${yPos + blockHeight + 40}" font-size="9" text-anchor="middle">${i+1}</text>`;
      }
    }
    
    // Draw motifs if provided
    if (motifs && motifs.length > 0) {
      const motifY = yPos + blockHeight + 50;
      
      // Add motif heading
      svg += `<text x="10" y="${motifY - 5}" font-size="12" font-weight="bold">Detected Motifs:</text>`;
      
      // Draw each motif
      motifs.forEach((motif, index) => {
        const startX = (motif.startPosition - 1) * blockWidth;
        const width = (motif.endPosition - motif.startPosition + 1) * blockWidth;
        const y = motifY + (index * 15);
        
        // Draw motif bar
        svg += `<rect x="${startX}" y="${y}" width="${width}" height="10" 
          fill="rgb(135, 206, 250)" stroke="rgb(70, 130, 180)" stroke-width="1" />`;
        
        // Add motif label
        svg += `<text x="${startX + width + 5}" y="${y + 8}" font-size="10">${motif.type}</text>`;
      });
    }
    
    // Add legend
    const legendY = motifs ? svgHeight - 40 : svgHeight - 60;
    
    svg += `
      <rect x="10" y="${legendY}" width="15" height="15" fill="${colors.H}" stroke="#999" stroke-width="0.5" />
      <text x="30" y="${legendY + 12}" font-size="12">α-helix (H)</text>
      
      <rect x="120" y="${legendY}" width="15" height="15" fill="${colors.E}" stroke="#999" stroke-width="0.5" />
      <text x="140" y="${legendY + 12}" font-size="12">β-strand (E)</text>
      
      <rect x="230" y="${legendY}" width="15" height="15" fill="${colors.C}" stroke="#999" stroke-width="0.5" />
      <text x="250" y="${legendY + 12}" font-size="12">Coil (C)</text>
    `;
    
    // If we have confidence scores, add a confidence legend
    if (confidenceScores) {
      svg += `
        <text x="340" y="${legendY + 12}" font-size="12">Confidence: </text>
        <rect x="420" y="${legendY}" width="100" height="15" 
          fill="url(#confidenceGradient)" stroke="#999" stroke-width="0.5" />
        <text x="420" y="${legendY + 30}" font-size="10">Low</text>
        <text x="510" y="${legendY + 30}" font-size="10">High</text>
        
        <defs>
          <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:rgb(200,200,200);stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:rgb(50,50,50);stop-opacity:1.0" />
          </linearGradient>
        </defs>
      `;
    }
    
    svg += '</svg>';
    return svg;
  }
  
  /**
   * Generates an SVG visualization of motifs found in a protein sequence
   * @param {string} sequence - The amino acid sequence
   * @param {Array} motifs - Array of detected motifs
   * @returns {string} SVG markup for the motif visualization
   */
  function generateMotifSVG(sequence, motifs) {
    const svgWidth = Math.max(800, sequence.length * 5 + 200);
    const svgHeight = 150 + (motifs.length * 25);
    
    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add title
    svg += `<text x="10" y="20" font-size="16" font-weight="bold">Protein Motif Analysis</text>`;
    svg += `<text x="10" y="40" font-size="12">Sequence length: ${sequence.length} amino acids</text>`;
    
    // Draw sequence backdrop
    const barHeight = 30;
    const barY = 60;
    svg += `<rect x="10" y="${barY}" width="${sequence.length * 5}" height="${barHeight}" fill="#f0f0f0" stroke="#ccc" />`;
    
    // Add scale markers
    for (let i = 0; i <= sequence.length; i += 50) {
      if (i <= sequence.length) {
        const x = 10 + (i * 5);
        svg += `<line x1="${x}" y1="${barY + barHeight}" x2="${x}" y2="${barY + barHeight + 5}" stroke="black" stroke-width="1" />`;
        svg += `<text x="${x}" y="${barY + barHeight + 20}" font-size="10" text-anchor="middle">${i}</text>`;
      }
    }
    
    // Color mapping for different motif types
    const motifColors = {
      'N-glycosylation': 'rgb(255, 165, 0)', // Orange
      'Casein_kinase_II_phosphorylation': 'rgb(135, 206, 250)', // Light blue
      'Tyrosine_kinase_phosphorylation': 'rgb(152, 251, 152)', // Pale green
      'Custom': 'rgb(216, 191, 216)', // Thistle
      'default': 'rgb(200, 200, 200)' // Light gray
    };
    
    // Draw motifs
    const motifY = barY + barHeight + 40;
    svg += `<text x="10" y="${motifY - 10}" font-size="14" font-weight="bold">Detected Motifs:</text>`;
    
    motifs.forEach((motif, idx) => {
      const y = motifY + (idx * 25);
      const color = motifColors[motif.type] || motifColors.default;
      
      // Draw motif bar
      const startX = 10 + ((motif.startPosition - 1) * 5);
      const width = (motif.endPosition - motif.startPosition + 1) * 5;
      
      svg += `<rect x="${startX}" y="${y}" width="${width}" height="20" 
        fill="${color}" stroke="#666" stroke-width="1" rx="2" ry="2" />`;
        
      // Add label
      svg += `<text x="${startX + width + 10}" y="${y + 15}" font-size="12">${motif.type}: ${motif.pattern} (${motif.startPosition}-${motif.endPosition})</text>`;
    });
    
    // Add legend
    const legendY = svgHeight - 40;
    let legendX = 10;
    
    for (const [type, color] of Object.entries(motifColors)) {
      if (type === 'default') continue;
      
      svg += `<rect x="${legendX}" y="${legendY}" width="15" height="15" fill="${color}" stroke="#666" stroke-width="0.5" />`;
      svg += `<text x="${legendX + 20}" y="${legendY + 12}" font-size="10">${type}</text>`;
      
      legendX += 180;
    }
    
    svg += '</svg>';
    return svg;
  }
  
  /**
   * Generates an SVG visualization of a protein fragment
   * @param {Object} fragment - Fragment object with sequence and other properties
   * @param {string} secondaryStructure - The predicted secondary structure
   * @returns {string} SVG markup for the fragment visualization
   */
  function generateFragmentSVG(fragment) {
    const sequence = fragment.sequence;
    const secondaryStructure = fragment.secondaryStructure;
    const svgWidth = 500;
    const svgHeight = 120;
    
    let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add title and info
    svg += `<text x="10" y="20" font-size="14" font-weight="bold">Fragment Visualization</text>`;
    svg += `<text x="10" y="40" font-size="12">Positions ${fragment.startPosition}-${fragment.endPosition}</text>`;
    
    // Colors for different structure types
    const colors = {
      H: 'rgb(240, 128, 128)', // Light red for alpha helix
      E: 'rgb(255, 255, 150)', // Light yellow for beta sheet
      C: 'rgb(200, 200, 200)'  // Light gray for coil
    };
    
    // Draw sequence with structure colors
    const charWidth = 25;
    const rectY = 50;
    const textY = rectY + 20;
    
    for (let i = 0; i < sequence.length; i++) {
      const x = 10 + (i * charWidth);
      const structure = secondaryStructure[i] || 'C';
      const color = colors[structure];
      
      // Draw background rectangle for structure
      svg += `<rect x="${x}" y="${rectY}" width="${charWidth}" height="30" 
        fill="${color}" stroke="#ccc" stroke-width="0.5" />`;
      
      // Draw amino acid letter
      svg += `<text x="${x + charWidth/2}" y="${textY}" 
        font-size="14" text-anchor="middle" font-weight="bold">${sequence[i]}</text>`;
    }
    
    // Add legend
    svg += `
      <rect x="10" y="95" width="15" height="15" fill="${colors.H}" stroke="#999" stroke-width="0.5" />
      <text x="30" y="107" font-size="12">α-helix (H)</text>
      
      <rect x="120" y="95" width="15" height="15" fill="${colors.E}" stroke="#999" stroke-width="0.5" />
      <text x="140" y="107" font-size="12">β-strand (E)</text>
      
      <rect x="230" y="95" width="15" height="15" fill="${colors.C}" stroke="#999" stroke-width="0.5" />
      <text x="250" y="107" font-size="12">Coil (C)</text>
    `;
    
    svg += '</svg>';
    return svg;
  }
  
  module.exports = {
    generateStructureSVG,
    generateMotifSVG,
    generateFragmentSVG
  };