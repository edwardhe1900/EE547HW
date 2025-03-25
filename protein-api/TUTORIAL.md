# Protein API Tutorial

This tutorial will guide you through the basic operations of the Protein API and web interface.

## API Usage

### Authentication

All API requests require the `X-User-ID` header for authentication. You can use:
- `admin-user-001` (admin access)
- `user-001` (basic access)

### Basic API Operations

#### 1. Creating a Protein

```bash
curl -X POST \
  -H "X-User-ID: admin-user-001" \
  -H "Content-Type: application/json" \
  -d '{"name": "Insulin", "sequence": "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN"}' \
  http://localhost:3000/api/proteins
```

#### 2. Listing All Proteins

```bash
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins
```

#### 3. Getting Protein Details

```bash
# Replace [protein-id] with the actual protein ID
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins/[protein-id]
```

#### 4. Getting Protein Structure

```bash
# Replace [protein-id] with the actual protein ID
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins/[protein-id]/structure
```

#### 5. Deleting a Protein

```bash
# Replace [protein-id] with the actual protein ID
curl -X DELETE -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins/[protein-id]
```

## Web Interface Usage

### Main Interface (http://localhost:3000/)

1. **Creating a New Protein**:
   - Click the "Add New Protein" button
   - Enter a name and sequence
   - Click "Create Protein"

2. **Viewing Protein Details**:
   - Select a protein from the list on the left
   - The details will appear in the main panel

3. **Understanding Structure Visualization**:
   - Red sections represent alpha helices (H)
   - Yellow sections represent extended strands (E)
   - Blue sections represent coils (C)
   - Hover over each position to see confidence scores

4. **Updating Protein Information**:
   - Select a protein
   - Click the "Edit" button
   - Update the name or description
   - Click "Save Changes"

5. **Deleting a Protein**:
   - Select a protein
   - Click the "Delete" button
   - Confirm the deletion when prompted

### Fragment Analysis Interface (http://localhost:3000/fragments)

1. **Selecting a Protein**:
   - Use the dropdown menu to select a protein
   - The fragments will be loaded automatically

2. **Viewing Fragment Details**:
   - Click on a fragment in the list
   - The sequence and structure details will be displayed

3. **Comparing Fragments**:
   - Select multiple fragments using checkboxes
   - Click "Compare Selected"
   - View the fragments side by side

4. **Analyzing Motifs**:
   - Motifs are highlighted in the fragment display
   - The motif type and confidence are shown below

## Example Workflow

### Analyzing a New Protein

1. Create a new protein with a known sequence:
   ```bash
   curl -X POST \
     -H "X-User-ID: admin-user-001" \
     -H "Content-Type: application/json" \
     -d '{"name": "Hemoglobin Alpha", "sequence": "MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR"}' \
     http://localhost:3000/api/proteins
   ```

2. Open the web interface at http://localhost:3000/

3. Select the newly created "Hemoglobin Alpha" protein

4. Analyze the structure prediction:
   - Note the alpha helices (red sections)
   - Check the confidence scores
   - Compare with known hemoglobin structure

5. Go to the fragments interface at http://localhost:3000/fragments

6. Select "Hemoglobin Alpha" from the dropdown

7. Explore the fragments and their structures

8. Identify interesting motifs and patterns

## Advanced Features

### Using the Search API

```bash
# Search by name
curl -H "X-User-ID: admin-user-001" "http://localhost:3000/api/proteins/search?name=glo"

# Search by molecular weight range
curl -H "X-User-ID: admin-user-001" "http://localhost:3000/api/proteins/search?molecularWeight[gt]=10000&molecularWeight[lt]=20000"

# Search by sequence length
curl -H "X-User-ID: admin-user-001" "http://localhost:3000/api/proteins/search?sequenceLength[gte]=100"

# Sort results
curl -H "X-User-ID: admin-user-001" "http://localhost:3000/api/proteins/search?sort=molecularWeight:desc"
```

### Creating a Protein from FASTA Format

```bash
# Save the FASTA sequence to a file
cat > sequence.fasta << EOL
>sp|P01308|INS_HUMAN Insulin OS=Homo sapiens OX=9606 GN=INS PE=1 SV=1
MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN
EOL

# Post the file content
curl -X POST \
  -H "X-User-ID: admin-user-001" \
  -H "Content-Type: text/plain" \
  --data-binary @sequence.fasta \
  http://localhost:3000/api/proteins/sequence
```

### Retrieving FASTA Format

```bash
# Replace [protein-id] with the actual protein ID
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins/[protein-id]/sequence > protein.fasta
``` 