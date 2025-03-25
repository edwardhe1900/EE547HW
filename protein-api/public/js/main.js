// public/js/main.js
// Main JavaScript file for the Protein API dashboard

// Global state variables
let currentPage = 1;
let pageSize = 10;
let totalProteins = 0;
let currentProtein = null;
let userId = 'user-001'; // Default user ID

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.getElementById('nav-dashboard').addEventListener('click', showDashboard);
  document.getElementById('nav-structure').addEventListener('click', showStructure);
  document.getElementById('nav-search').addEventListener('click', showSearch);
  
  // Sections
  const dashboardSection = document.getElementById('dashboard-section');
  const structureSection = document.getElementById('structure-section');
  const searchSection = document.getElementById('search-section');
  
  // Forms
  const proteinForm = document.getElementById('protein-form');
  const searchForm = document.getElementById('search-form');
  
  // Buttons
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const refreshListBtn = document.getElementById('refresh-list');
  
  // Protein modal elements
  const proteinModal = document.getElementById('protein-modal');
  const modalClose = proteinModal.querySelector('.close-btn');
  const modalCloseBtn = document.getElementById('modal-close');
  const modalVisualizeBtn = document.getElementById('modal-visualize');
  const modalDeleteBtn = document.getElementById('modal-delete');
  
  // User ID input
  const userIdInput = document.getElementById('userIdInput');
  userIdInput.addEventListener('change', () => {
    userId = userIdInput.value.trim();
    refreshProteinList();
  });
  
  // Event Listeners
  proteinForm.addEventListener('submit', handleProteinSubmit);
  searchForm.addEventListener('submit', handleSearchSubmit);
  
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
  
  // Modal event listeners
  modalClose.addEventListener('click', closeModal);
  modalCloseBtn.addEventListener('click', closeModal);
  modalVisualizeBtn.addEventListener('click', visualizeCurrentProtein);
  modalDeleteBtn.addEventListener('click', deleteCurrentProtein);
  
  // Initialize
  refreshProteinList();
  
  // Set up search motif dropdown behavior
  const searchMotif = document.getElementById('search-motif');
  const customMotif = document.getElementById('custom-motif');
  
  searchMotif.addEventListener('change', () => {
    if (searchMotif.value === 'custom') {
      customMotif.classList.remove('hidden');
    } else {
      customMotif.classList.add('hidden');
    }
  });
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
function showDashboard(e) {
  if (e) e.preventDefault();
  setActiveNavItem('nav-dashboard');
  setActiveSection('dashboard-section');
  refreshProteinList();
}

function showStructure(e) {
  if (e) e.preventDefault();
  setActiveNavItem('nav-structure');
  setActiveSection('structure-section');
}

function showSearch(e) {
  if (e) e.preventDefault();
  setActiveNavItem('nav-search');
  setActiveSection('search-section');
}

function setActiveNavItem(id) {
  document.querySelectorAll('nav a').forEach(link => {
    link.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

function setActiveSection(id) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
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
    proteinList.innerHTML = '<p>No proteins found. Add a new protein to get started.</p>';
    return;
  }
  
  // Clear the loading indicator
  proteinList.innerHTML = '';
  
  // Create a protein card for each protein
  proteins.forEach(protein => {
    const card = document.createElement('div');
    card.className = 'protein-card';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'protein-name';
    nameSpan.textContent = protein.name;
    
    const lengthSpan = document.createElement('span');
    lengthSpan.className = 'protein-meta';
    lengthSpan.textContent = `Length: ${protein.sequenceLength}`;
    
    const weightSpan = document.createElement('span');
    weightSpan.className = 'protein-meta';
    weightSpan.textContent = `MW: ${protein.molecularWeight.toFixed(2)} Da`;
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn small';
    viewBtn.textContent = 'View';
    viewBtn.addEventListener('click', () => showProteinDetails(protein.proteinId));
    
    card.appendChild(nameSpan);
    card.appendChild(lengthSpan);
    card.appendChild(weightSpan);
    card.appendChild(viewBtn);
    
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

// Form handling
async function handleProteinSubmit(e) {
  e.preventDefault();
  
  const nameInput = document.getElementById('protein-name');
  const sequenceInput = document.getElementById('protein-sequence');
  const descriptionInput = document.getElementById('protein-description');
  
  const name = nameInput.value.trim();
  const sequence = sequenceInput.value.trim().toUpperCase();
  const description = descriptionInput.value.trim();
  
  // Basic validation
  if (!sequence) {
    showAlert('Please enter a protein sequence', 'error');
    return;
  }
  
  // Validate sequence format (only valid amino acid codes)
  const validAminoAcids = /^[ACDEFGHIKLMNPQRSTVWY]+$/;
  if (!validAminoAcids.test(sequence)) {
    showAlert('Sequence must contain only valid amino acid codes (A-Z, excluding B, J, O, U, X, Z)', 'error');
    return;
  }
  
  try {
    const data = {
      sequence,
      name: name || undefined,
      description: description || undefined
    };
    
    const response = await fetchAPI('/api/proteins', {
      method: 'POST',
      body: data
    });
    
    showAlert(`Protein "${response.name}" added successfully!`, 'success');
    
    // Reset form
    nameInput.value = '';
    sequenceInput.value = '';
    descriptionInput.value = '';
    
    // Refresh protein list
    refreshProteinList();
  } catch (error) {
    console.error('Error submitting protein:', error);
  }
}

async function handleSearchSubmit(e) {
  e.preventDefault();
  
  const nameInput = document.getElementById('search-name');
  const motifSelect = document.getElementById('search-motif');
  const customMotifInput = document.getElementById('custom-motif');
  const molWeightOpSelect = document.getElementById('search-mol-weight-op');
  const molWeightValInput = document.getElementById('search-mol-weight-val');
  const seqLengthOpSelect = document.getElementById('search-seq-length-op');
  const seqLengthValInput = document.getElementById('search-seq-length-val');
  const sortSelect = document.getElementById('search-sort');
  
  // Build query string
  const params = new URLSearchParams();
  
  if (nameInput.value) {
    params.append('name', nameInput.value);
  }
  
  // Handle motif
  if (motifSelect.value) {
    if (motifSelect.value === 'custom') {
      if (customMotifInput.value) {
        params.append('motif', customMotifInput.value);
      }
    } else {
      params.append('motif', motifSelect.value);
    }
  }
  
  // Handle molecular weight
  if (molWeightOpSelect.value && molWeightValInput.value) {
    params.append(`molecularWeight[${molWeightOpSelect.value}]`, molWeightValInput.value);
  }
  
  // Handle sequence length
  if (seqLengthOpSelect.value && seqLengthValInput.value) {
    params.append(`sequenceLength[${seqLengthOpSelect.value}]`, seqLengthValInput.value);
  }
  
  // Handle sort
  if (sortSelect.value) {
    params.append('sort', sortSelect.value);
  }
  
  try {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '<div class="loading">Searching proteins...</div>';
    
    const results = await fetchAPI(`/api/proteins/search?${params.toString()}`);
    
    if (results.length === 0) {
      searchResults.innerHTML = '<p>No proteins found matching your search criteria.</p>';
      return;
    }
    
    // Render search results
    searchResults.innerHTML = '';
    results.forEach(protein => {
      const card = document.createElement('div');
      card.className = 'protein-card';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'protein-name';
      nameSpan.textContent = protein.name;
      
      const lengthSpan = document.createElement('span');
      lengthSpan.className = 'protein-meta';
      lengthSpan.textContent = `Length: ${protein.sequenceLength}`;
      
      const weightSpan = document.createElement('span');
      weightSpan.className = 'protein-meta';
      weightSpan.textContent = `MW: ${protein.molecularWeight.toFixed(2)} Da`;
      
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn small';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => showProteinDetails(protein.proteinId));
      
      card.appendChild(nameSpan);
      card.appendChild(lengthSpan);
      card.appendChild(weightSpan);
      card.appendChild(viewBtn);
      
      searchResults.appendChild(card);
    });
  } catch (error) {
    console.error('Error searching proteins:', error);
  }
}

// Protein details and visualization
async function showProteinDetails(proteinId) {
  try {
    const protein = await fetchAPI(`/api/proteins/${proteinId}`);
    currentProtein = protein;
    
    // Populate modal
    document.getElementById('modal-title').textContent = protein.name;
    
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = `
      <div class="protein-detail">
        <p><strong>ID:</strong> ${protein.proteinId}</p>
        <p><strong>Name:</strong> ${protein.name}</p>
        <p><strong>Molecular Weight:</strong> ${protein.molecularWeight.toFixed(2)} Da</p>
        <p><strong>Sequence Length:</strong> ${protein.sequenceLength}</p>
        <p><strong>Created:</strong> ${new Date(protein.createdAt).toLocaleString()}</p>
        <p><strong>Last Updated:</strong> ${new Date(protein.updatedAt).toLocaleString()}</p>
        ${protein.description ? `<p><strong>Description:</strong> ${protein.description}</p>` : ''}
        <p><a href="${protein.sequenceUrl}" target="_blank">Download FASTA Sequence</a></p>
      </div>
    `;
    
    // Show modal
    document.getElementById('protein-modal').style.display = 'block';
  } catch (error) {
    console.error('Error fetching protein details:', error);
  }
}

async function visualizeCurrentProtein() {
  if (!currentProtein) return;
  
  try {
    // Close modal
    closeModal();
    
    // Switch to structure view
    showStructure();
    
    // Update protein info section
    const proteinInfo = document.getElementById('protein-info');
    proteinInfo.innerHTML = `
      <h3>${currentProtein.name}</h3>
      <p><strong>Length:</strong> ${currentProtein.sequenceLength} amino acids</p>
      <p><strong>Molecular Weight:</strong> ${currentProtein.molecularWeight.toFixed(2)} Da</p>
    `;
    
    // Fetch structure visualization
    const response = await fetch(`/api/proteins/${currentProtein.proteinId}/structure`, {
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
    const visualizationContainer = document.getElementById('visualization-container');
    visualizationContainer.innerHTML = svgText;
    
    // Fetch motifs
    const motifsResponse = await fetch(`/api/proteins/${currentProtein.proteinId}/motifs`, {
      headers: {
        'X-User-ID': userId,
        'Accept': 'image/svg+xml'
      }
    });
    
    if (!motifsResponse.ok) {
      throw new Error(`Error: ${motifsResponse.status} ${motifsResponse.statusText}`);
    }
    
    const motifsSvg = await motifsResponse.text();
    
    // Display motifs visualization
    const motifContainer = document.getElementById('motif-container');
    motifContainer.innerHTML = motifsSvg;
    
    // Fetch protein fragments
    const fragments = await fetchAPI(`/api/proteins/${currentProtein.proteinId}/fragments`);
    
    // Display fragment overview
    const fragmentList = document.getElementById('fragment-list');
    fragmentList.innerHTML = '';
    
    if (fragments.length === 0) {
      fragmentList.innerHTML = '<p>No fragments available for this protein.</p>';
      return;
    }
    
    fragments.forEach(fragment => {
      const fragmentEl = document.createElement('div');
      fragmentEl.className = 'fragment-item';
      
      const header = document.createElement('div');
      header.className = 'fragment-header';
      header.textContent = `Fragment ${fragment.startPosition}-${fragment.endPosition}`;
      
      const sequence = document.createElement('div');
      sequence.className = 'fragment-sequence';
      sequence.textContent = fragment.sequence;
      
      const structure = document.createElement('div');
      structure.className = 'fragment-structure';
      structure.textContent = `Structure: ${fragment.secondaryStructure}`;
      
      const viewButton = document.createElement('button');
      viewButton.className = 'btn small';
      viewButton.textContent = 'View';
      viewButton.addEventListener('click', () => {
        window.open(`/api/fragments/${fragment.fragmentId}/visualization`, '_blank');
      });
      
      fragmentEl.appendChild(header);
      fragmentEl.appendChild(sequence);
      fragmentEl.appendChild(structure);
      fragmentEl.appendChild(viewButton);
      
      fragmentList.appendChild(fragmentEl);
    });
  } catch (error) {
    console.error('Error visualizing protein:', error);
    showAlert(error.message, 'error');
  }
}

async function deleteCurrentProtein() {
  if (!currentProtein) return;
  
  if (!confirm(`Are you sure you want to delete "${currentProtein.name}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    await fetchAPI(`/api/proteins/${currentProtein.proteinId}`, {
      method: 'DELETE'
    });
    
    showAlert(`Protein "${currentProtein.name}" deleted successfully`, 'success');
    closeModal();
    refreshProteinList();
  } catch (error) {
    console.error('Error deleting protein:', error);
  }
}

// Utility functions
function closeModal() {
  document.getElementById('protein-modal').style.display = 'none';
  currentProtein = null;
}

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