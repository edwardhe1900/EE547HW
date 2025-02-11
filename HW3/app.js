const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'proteins.json');

app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files for visualization

// Helper function to read and write data
const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// GET all proteins
app.get('/api/proteins', (req, res) => {
  const proteins = readData();
  res.json(proteins);
});

// GET a single protein by ID
app.get('/api/proteins/:id', (req, res) => {
  const proteins = readData();
  const protein = proteins.find(p => p.id === req.params.id);
  if (protein) {
    res.json(protein);
  } else {
    res.status(404).json({ message: 'Protein not found' });
  }
});

// POST a new protein
app.post('/api/proteins', (req, res) => {
  const proteins = readData();
  const newProtein = { id: Date.now().toString(), ...req.body };
  proteins.push(newProtein);
  writeData(proteins);
  res.status(201).json(newProtein);
});

// PUT (update) a protein by ID
app.put('/api/proteins/:id', (req, res) => {
  const proteins = readData();
  const index = proteins.findIndex(p => p.id === req.params.id);
  if (index !== -1) {
    proteins[index] = { ...proteins[index], ...req.body };
    writeData(proteins);
    res.json(proteins[index]);
  } else {
    res.status(404).json({ message: 'Protein not found' });
  }
});

// DELETE a protein by ID
app.delete('/api/proteins/:id', (req, res) => {
  const proteins = readData();
  const filteredProteins = proteins.filter(p => p.id !== req.params.id);
  if (filteredProteins.length < proteins.length) {
    writeData(filteredProteins);
    res.json({ message: 'Protein deleted' });
  } else {
    res.status(404).json({ message: 'Protein not found' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
