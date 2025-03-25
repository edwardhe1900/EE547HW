# Protein API Web Interface Screenshots

## Main Visualization Interface (http://localhost:3000/)

The main visualization interface provides a user-friendly way to manage and visualize protein data:

### Features:
- **Protein List**: Left sidebar showing all proteins in the database with their names and basic information
- **Protein Creation Form**: Form to add new proteins with name and sequence fields
- **Protein Details Panel**: Shows detailed information about the selected protein
- **Structure Visualization**: Interactive visualization of the protein's secondary structure prediction
- **Statistics Panel**: Shows molecular weight, sequence length, and other key metrics
- **Actions**: Buttons to delete or update protein information

### Example View:
When a protein like "GAPDH" is selected, the interface shows:
- The complete amino acid sequence
- A color-coded visualization of the secondary structure (Helices in red, Extended strands in yellow, Coils in blue)
- Confidence scores for each position in the structure prediction
- Molecular statistics including weight, length, and creation date

## Fragment Analysis Interface (http://localhost:3000/fragments)

The fragment analysis interface allows for detailed exploration of protein fragments:

### Features:
- **Protein Selector**: Dropdown to select a protein from the database
- **Fragments List**: All fragments of the selected protein with their positions
- **Fragment Details**: Sequence and structure information for the selected fragment
- **Comparative View**: Compare multiple fragments side by side
- **Motif Highlighting**: Visual highlighting of motifs within fragments
- **Confidence Score Graph**: Graph showing prediction confidence for each position

### Example View:
When fragments of "GAPDH" are viewed, the interface shows:
- Fragment sequences split using a sliding window approach
- Secondary structure prediction for each fragment
- Color-coded visualization matching the structure type
- Interactive elements to explore prediction details
- Confidence scores for the structure prediction

## API Documentation Interface (http://localhost:3000/api)

The API documentation interface provides a JSON representation of available endpoints:

### Features:
- Complete list of all API endpoints
- HTTP methods (GET, POST, PUT, DELETE)
- Path parameters and descriptions
- Authentication requirements
- Example usage

### Example View:
The API documentation shows a comprehensive list of endpoints including:
- Protein management endpoints
- Structure prediction endpoints
- Fragment analysis endpoints
- Sequence retrieval endpoints
- Search and filtering capabilities 