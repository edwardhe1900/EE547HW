// public/js/fragments.js
// JavaScript for the protein fragments analysis page

// Global state variables
let currentPage = 1;
let pageSize = 10;
let totalProteins = 0;
let selectedProteinId = null;
let selectedProtein = null;
let userId = 'user-001'; // Default user ID

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.getElementById('nav-dashboard').addEventListener('click', () => {
    window.location.href = '/';
  });
  
  document.getElementById('nav-fragments').addEventListener('click', (e) => {
    e.preventDefault();
    showFragmentsSection();
  });
  
  document.getElementById('nav-motifs').addEventListener('click', showMotifSection);
  
  // User ID input
  const userIdInput = document.getElementById('userIdInput');
  userIdInput.addEventListener('change', () => {
    userId = userIdInput.value.trim();
    refreshProteinList();
  });
  
  // Protein search
  const proteinSearch = document.getElementById('protein-search');
  proteinSearch.addEventListener('input', debounce(filterProteins, 300));
  
  // Pagination buttons
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const refreshListBtn = document.getElementById('refresh-list');
  
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      refreshProteinList();
    }
  });
  
  nextPageBtn.addEventListener('click', () => {
    currentPage++;
    refreshProteinList();
  });
  
  refreshListBtn.addEventListener('click', refreshProteinList);
  
  // Fragment modal elements
  const fragmentModal = document.getElementById('fragment-modal');
  const modalClose = fragmentModal.querySelector('.close-btn');
  const modalCloseBtn = document.getElementById('modal-close');
  const modalVisualizeBtn = document.getElementById('modal-visualize');
  
  modalClose.addEventListener('click', closeModal);
  modalCloseBtn.addEventListener('click', closeModal);
  modalVisualizeBtn.addEventListener('click', visualizeCurrentFragment);
  
  // Motif search form
  const motifSearchForm = document.getElementById('motif-search-form');
  motifSearchForm.addEventListener('submit', handleMotifSearch);
  
  // Motif type selection
  const motifType = document.getElementById('motif-type');
  const customMotifGroup = document.getElementById('custom-motif-group');
  
  motifType.addEventListener('change', () => {
    if (motifType.value === 'custom') {
      customMotifGroup.style.display = 'block';
    } else {
      customMotifGroup.style.display = 'none';
    }
  });
  
  // Initialize
  refreshProteinList();
});

// API requests with authentication header
async function fetchAPI(url, options = {}) {
  const defaultOptions = {
    headers: {
      'X-User-ID': userId,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  if (options.body && typeof options.body === 'object') {
    mergedOptions.body = JSON.stringify(options.body);
  }
  
  try {
    const response = await fetch(url, mergedOptions);
    
    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`);
    }
    
    // Return parsed JSON for JSON responses, or raw response for others
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return response;
  } catch (error) {
    showAlert(error.message, 'error');
    throw error;
  }
}

// Navigation functions
function showMotifSection() {
  document.getElementById('fragments-section').classList.add('hidden');
  document.getElementById('motifs-section').classList.remove('hidden');
  
  // Update navigation
  document.querySelectorAll('nav a').forEach(link => {
    link.classList.remove('active');
  });
  document.getElementById('nav-motifs').classList.add('active');
}

function showFragmentsSection() {
  document.getElementById('motifs-section').classList.add('hidden');
  document.getElementById('fragments-section').classList.remove('hidden');
  
  // Update navigation
  document.querySelectorAll('nav a').forEach(link => {
    link.classList.remove('active');
  });
  document.getElementById('nav-fragments').classList.add('active');
}

// Protein list functions
async function refreshProteinList() {
  try {
    const proteinList = document.getElementById('protein-list');
    proteinList.innerHTML = '<div class="loading">Loading proteins...</div>';
    
    const data = await fetchAPI(`/api/proteins?limit=${pageSize}&offset=${(currentPage - 1) * pageSize}`);
    
    totalProteins = data.total;
    updatePagination();
    renderProteinList(data.proteins);
  } catch (error) {
    console.error('Error refreshing protein list:', error);
  }
}

function renderProteinList(proteins) {
  const proteinList = document.getElementById('protein-list');
  
  if (proteins.length === 0) {
    proteinList.innerHTML = '<p>No proteins found. Add proteins from the main dashboard.</p>';
    return;
  }
  
  // Clear the loading indicator
  proteinList.innerHTML = '';
  
  // Create a protein card for each protein
  proteins.forEach(protein => {
    const card = document.createElement('div');
    card.className = 'protein-card';
    
    if (selectedProteinId === protein.proteinId) {
      card.classList.add('selected');
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'protein-name';
    nameSpan.textContent = protein.name;
    
    const lengthSpan = document.createElement('span');
    lengthSpan.className = 'protein-meta';
    lengthSpan.textContent = `Length: ${protein.sequenceLength}`;
    
    const selectBtn = document.createElement('button');
    selectBtn.className = 'btn small';
    selectBtn.textContent = selectedProteinId === protein.proteinId ? 'Selected' : 'Select';
    selectBtn.addEventListener('click', () => selectProtein(protein.proteinId));
    
    card.appendChild(nameSpan);
    card.appendChild(lengthSpan);
    card.appendChild(selectBtn);
    
    proteinList.appendChild(card);
  });
}

function updatePagination() {
  const pageInfo = document.getElementById('page-info');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  
  const totalPages = Math.ceil(totalProteins / pageSize);
  pageInfo.textContent = `Page ${currentPage} of ${Math.max(1, totalPages)}`;
  
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
}

function filterProteins() {
  const searchTerm = document.getElementById('protein-search').value.toLowerCase();
  const proteinCards = document.querySelectorAll('.protein-card');
  
  proteinCards.forEach(card => {
    const proteinName = card.querySelector('.protein-name').textContent.toLowerCase();
    
    if (proteinName.includes(searchTerm)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// Protein selection and fragment analysis
async function selectProtein(proteinId) {
  try {
    selectedProteinId = proteinId;
    
    // Get protein details
    selectedProtein = await fetchAPI(`/api/proteins/${proteinId}`);
    
    // Show fragments section
    showFragmentsSection();
    document.getElementById('fragments-section').classList.remove('hidden');
    
    // Update protein info
    const proteinInfo = document.getElementById('protein-info');
    proteinInfo.innerHTML = `
      <h3>${selectedProtein.name}</h3>
      <p><strong>Length:</strong> ${selectedProtein.sequenceLength} amino acids</p>
      <p><strong>Molecular Weight:</strong> ${selectedProtein.molecularWeight.toFixed(2)} Da</p>
    `;
    
    // Fetch structure visualization
    const response = await fetch(`/api/proteins/${proteinId}/structure`, {
      headers: {
        'X-User-ID': userId,
        'Accept': 'image/svg+xml'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const svgText = await response.text();
    
    // Display structure visualization
    const visualizationContainer = document.getElementById('protein-visualization');
    visualizationContainer.innerHTML = svgText;
    
    // Fetch fragments
    const fragments = await fetchAPI(`/api/proteins/${proteinId}/fragments`);
    
    // Display fragments
    renderFragments(fragments);
    
    // Update protein list to show selection
    refreshProteinList();
  } catch (error) {
    console.error('Error selecting protein:', error);
    showAlert(error.message, 'error');
  }
}

function renderFragments(fragments) {
  const fragmentsGrid = document.getElementById('fragments-grid');
  
  if (!fragments || fragments.length === 0) {
    fragmentsGrid.innerHTML = '<p>No fragments available for this protein.</p>';
    return;
  }
  
  fragmentsGrid.innerHTML = '';
  
  fragments.forEach(fragment => {
    const fragmentCard = document.createElement('div');
    fragmentCard.className = 'fragment-card';
    
    const header = document.createElement('div');
    header.className = 'fragment-header';
    header.textContent = `${fragment.startPosition}-${fragment.endPosition}`;
    
    const sequence = document.createElement('div');
    sequence.className = 'fragment-sequence';
    sequence.textContent = fragment.sequence;
    
    const structure = document.createElement('div');
    structure.className = 'fragment-structure';
    
    // Create structure visualization using colored spans
    fragment.secondaryStructure.split('').forEach((struct, i) => {
      const span = document.createElement('span');
      span.className = `structure-${struct.toLowerCase()}`;
      span.textContent = struct;
      span.title = `Confidence: ${Math.round(fragment.confidenceScores[i] * 100)}%`;
      structure.appendChild(span);
    });
    
    const motifs = document.createElement('div');
    motifs.className = 'fragment-motifs';
    
    if (fragment.motifs && fragment.motifs.length > 0) {
      motifs.textContent = `Motifs: ${fragment.motifs.join(', ')}`;
    } else {
      motifs.textContent = 'No motifs found';
    }
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn small';
    viewBtn.textContent = 'Details';
    viewBtn.addEventListener('click', () => showFragmentDetails(fragment));
    
    fragmentCard.appendChild(header);
    fragmentCard.appendChild(sequence);
    fragmentCard.appendChild(structure);
    fragmentCard.appendChild(motifs);
    fragmentCard.appendChild(viewBtn);
    
    fragmentsGrid.appendChild(fragmentCard);
  });
}

// Fragment details modal
function showFragmentDetails(fragment) {
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  
  modalTitle.textContent = `Fragment ${fragment.startPosition}-${fragment.endPosition}`;
  
  modalContent.innerHTML = `
    <div class="fragment-detail">
      <p><strong>Fragment ID:</strong> ${fragment.fragmentId}</p>
      <p><strong>Protein ID:</strong> ${fragment.proteinId}</p>
      <p><strong>Position:</strong> ${fragment.startPosition}-${fragment.endPosition}</p>
      <p><strong>Sequence:</strong> ${fragment.sequence}</p>
      <p><strong>Secondary Structure:</strong> ${fragment.secondaryStructure}</p>
      
      <div class="confidence-scores">
        <p><strong>Confidence Scores:</strong></p>
        <div class="score-bars">
          ${fragment.confidenceScores.map((score, i) => `
            <div class="score-bar-container">
              <div class="score-label">${fragment.sequence[i]}</div>
              <div class="score-bar" style="width: ${score * 100}%;" title="${Math.round(score * 100)}%"></div>
              <div class="score-value">${Math.round(score * 100)}%</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <p><strong>Motifs:</strong> ${fragment.motifs && fragment.motifs.length > 0 ? fragment.motifs.join(', ') : 'None'}</p>
      <p><strong>Created:</strong> ${new Date(fragment.createdAt).toLocaleString()}</p>
    </div>
  `;
  
  // Store current fragment for visualization
  window.currentFragment = fragment;
  
  // Show modal
  document.getElementById('fragment-modal').style.display = 'block';
}

function visualizeCurrentFragment() {
  if (!window.currentFragment) return;
  
  window.open(`/api/fragments/${window.currentFragment.fragmentId}/visualization`, '_blank');
}

function closeModal() {
  document.getElementById('fragment-modal').style.display = 'none';
  window.currentFragment = null;
}

// Motif search handling
async function handleMotifSearch(e) {
  e.preventDefault();
  
  if (!selectedProteinId) {
    showAlert('Please select a protein first', 'error');
    return;
  }
  
  const motifTypeSelect = document.getElementById('motif-type');
  const customMotifInput = document.getElementById('custom-motif');
  
  let motifPattern;
  
  if (motifTypeSelect.value === 'custom') {
    motifPattern = customMotifInput.value.trim();
    if (!motifPattern) {
      showAlert('Please enter a custom motif pattern', 'error');
      return;
    }
  } else if (motifTypeSelect.value === 'all') {
    motifPattern = '';
  } else {
    motifPattern = motifTypeSelect.value;
  }
  
  try {
    // Get sequence
    const sequence = await fetch(`/api/proteins/${selectedProteinId}/sequence`, {
      headers: {
        'X-User-ID': userId
      }
    }).then(res => res.text());
    
    // Extract sequence from FASTA format
    const sequenceLines = sequence.split('\n').slice(1).join('');
    
    // Fetch motifs
    let url = `/api/proteins/${selectedProteinId}/motifs`;
    if (motifPattern) {
      url += `?motif=${encodeURIComponent(motifPattern)}`;
    }
    
    const motifsData = await fetchAPI(url);
    
    // Get motif visualization
    const motifResponse = await fetch(url, {
      headers: {
        'X-User-ID': userId,
        'Accept': 'image/svg+xml'
      }
    });
    
    if (!motifResponse.ok) {
      throw new Error(`Error: ${motifResponse.status} ${motifResponse.statusText}`);
    }
    
    const motifSvg = await motifResponse.text();
    
    // Display motif visualization
    const motifVisualization = document.getElementById('motif-visualization');
    motifVisualization.innerHTML = motifSvg;
    
    // Display motif results
    const motifResults = document.getElementById('motif-results');
    
    if (!motifsData.motifs || motifsData.motifs.length === 0) {
      motifResults.innerHTML = '<p>No motifs found matching the pattern</p>';
      return;
    }
    
    motifResults.innerHTML = '';
    
    motifsData.motifs.forEach(motif => {
      const motifItem = document.createElement('div');
      motifItem.className = 'motif-item';
      
      const start = motif.startPosition;
      const end = motif.endPosition;
      const pattern = sequenceLines.substring(start - 1, end);
      
      motifItem.innerHTML = `
        <div class="motif-header">
          <span class="motif-type">${motif.type}</span>
          <span class="motif-position">Position ${start}-${end}</span>
        </div>
        <div class="motif-pattern">${pattern}</div>
        <div class="motif-description">${motif.description || ''}</div>
      `;
      
      motifResults.appendChild(motifItem);
    });
    
    // Show motifs section
    showMotifSection();
  } catch (error) {
    console.error('Error searching motifs:', error);
    showAlert(error.message, 'error');
  }
}

// Utility functions
function showAlert(message, type = 'info') {
  const alertBox = document.getElementById('alert-box');
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
  alertBox.classList.remove('hidden');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    alertBox.classList.add('hidden');
  }, 5000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}