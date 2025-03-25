# Protein API and Visualization Tool

A comprehensive platform for protein data management, analysis, and visualization with both RESTful API and web-based interfaces.

## Features

- **RESTful API**: Manage protein data with CRUD operations
- **Secondary Structure Prediction**: Using GOR algorithm
- **Protein Fragmentation**: Analyze protein segments using sliding window approach
- **Motif Detection**: Identify sequence patterns
- **Interactive Visualization**: Web-based protein data visualization
- **Fragment Analysis**: Dedicated interface for fragment exploration
- **Advanced Search**: Filter proteins by name, molecular weight, sequence length, and motifs

## Protein Fragment Analysis

When a new protein is added, the system automatically:

1. **Breaks the sequence into overlapping fragments** using a sliding window approach:
   - Window size: 15 amino acids
   - Step size: 5 (resulting in a 10 amino acid overlap between consecutive fragments)
   - Example: For sequence "ABCDEFGHIJKLMNOPQRST":
     - Fragment 1: ABCDEFGHIJKLMNO (positions 1-15)
     - Fragment 2: FGHIJKLMNOPQRST (positions 6-20)
     - And so on until the end of the sequence

2. **Predicts secondary structure** for each fragment using the GOR method:
   - Helix (H): Alpha helices
   - Extended (E): Beta strands
   - Coil (C): Loops and unstructured regions
   - Each position includes a confidence score between 0 and 1

3. **Stores fragment data** in the database:
   - Fragment sequences with their positions in the original protein
   - Secondary structure predictions
   - Confidence scores for each position (stored as JSONB data)
   - Identified motifs within each fragment (stored as JSONB data)

## Data Storage Architecture

The Protein API implements a hybrid storage approach that optimizes performance and flexibility:

### Database Storage (PostgreSQL)

1. **Protein Metadata**:
   - All protein metadata (excluding the actual sequence) is stored in the `proteins` table
   - This includes protein ID, name, description, molecular weight, sequence length, timestamps, and a URL to access the sequence
   - Data is normalized to ensure integrity and prevent redundancy

2. **Fragment Data**:
   - When a protein is created, its sequence is automatically fragmented
   - Each fragment is stored in the `fragments` table with:
     - A unique ID
     - Reference to the parent protein
     - Fragment sequence
     - Start and end positions
     - Secondary structure prediction
     - Confidence scores (as JSONB)
     - Motif data (as JSONB)

3. **Motif Information**:
   - Motifs are stored in two ways for flexibility and performance:
     - As JSONB data directly in the fragments table for efficient retrieval
     - In a separate `motifs` table for complex querying and aggregation

### File-based Storage

1. **Protein Sequences**:
   - The full protein sequence is stored in FASTA format files
   - Files are named using the protein's UUID and stored in the `data/sequences` directory
   - The API provides a URL to download or access the sequence
   - This approach allows handling of very large sequences without database size limitations

### Data Retrieval

The API seamlessly combines database and file-based storage:

1. **GET /api/proteins**:
   - Retrieves protein metadata directly from the PostgreSQL database
   - Returns a paginated list with proper metadata (total count, limit, offset)

2. **GET /api/proteins/:proteinId**:
   - Fetches specific protein metadata from the database

3. **GET /api/proteins/:proteinId/sequence**:
   - Reads the protein sequence from the corresponding FASTA file
   - Returns it in the appropriate format

4. **GET /api/proteins/:proteinId/fragments**:
   - Queries the database for all fragments associated with the protein
   - Combines the fragment data with its motifs
   - Returns a denormalized structure for client convenience

This hybrid approach offers several advantages:
- Efficient storage of large sequences
- Fast metadata queries
- Optimized fragment and motif analysis
- Flexibility for future enhancements

## Search Functionality

The API includes a powerful search endpoint (`/api/proteins/search`) that allows filtering proteins based on multiple criteria:

### Name Search
- Supports partial matching
- Example: `/api/proteins/search?name=hemoglobin` will find proteins with "hemoglobin" in their name

### Numeric Range Filtering
- **Molecular Weight**: Filter by exact value or range
  - Using simplified parameter names (recommended):
    - `molecularWeightGt`: Greater than
    - `molecularWeightGte`: Greater than or equal to
    - `molecularWeightLt`: Less than
    - `molecularWeightLte`: Less than or equal to
    - `molecularWeightEq`: Equal to
    - Example: `/api/proteins/search?molecularWeightGte=10000&molecularWeightLt=20000`
  
  - Using bracket notation (also supported):
    - `molecularWeight[eq]`: Equal to
    - `molecularWeight[gt]`: Greater than
    - `molecularWeight[gte]`: Greater than or equal to
    - `molecularWeight[lt]`: Less than
    - `molecularWeight[lte]`: Less than or equal to

- **Sequence Length**: Filter by exact value or range
  - Using simplified parameter names (recommended):
    - `sequenceLengthGt`: Greater than
    - `sequenceLengthGte`: Greater than or equal to
    - `sequenceLengthLt`: Less than
    - `sequenceLengthLte`: Less than or equal to
    - `sequenceLengthEq`: Equal to
    - Example: `/api/proteins/search?sequenceLengthGt=100`
  
  - Using bracket notation (also supported):
    - `sequenceLength[eq]`: Equal to
    - `sequenceLength[gt]`: Greater than
    - `sequenceLength[gte]`: Greater than or equal to
    - `sequenceLength[lt]`: Less than
    - `sequenceLength[lte]`: Less than or equal to

### Motif Pattern Matching
- Search for proteins containing specific motifs in their fragments
- Supports predefined motif patterns or custom regex patterns
- **Predefined Motifs**:
  1. **N-glycosylation site**: `N[^P][ST][^P]`
     - An N followed by any amino acid except P, then either S or T, and again any amino acid except P
     - Example: `/api/proteins/search?motif=N-glycosylation`
  
  2. **Casein kinase II phosphorylation site**: `[ST].{2}[DE]`
     - Either S or T, followed by any two amino acids, then either D or E
     - Example: `/api/proteins/search?motif=Casein_kinase_II_phosphorylation`
  
  3. **Tyrosine kinase phosphorylation site**: `[RK].{0,2}[DE]`
     - Either R or K, followed by 0 to 2 of any amino acid, then either D or E
     - Example: `/api/proteins/search?motif=Tyrosine_kinase_phosphorylation`

- **Custom pattern**: You can also directly provide a regular expression pattern
  - Example: `/api/proteins/search?motif=P.P`

### Sorting Results
- Sort results by specific fields with ascending or descending order
- Syntax: `sort=field:direction`
- Available fields: `name`, `createdAt`, `molecularWeight`, `sequenceLength`
- Directions: `asc` (ascending), `desc` (descending)
- Example: `/api/proteins/search?sort=molecularWeight:desc`

### Combining Filters
- All filters can be combined in a single query
- Example: `/api/proteins/search?name=kinase&molecularWeight[gt]=50000&motif=Tyrosine_kinase_phosphorylation&sort=sequenceLength:desc`

## Database Transactions

The Protein API implements database transactions to maintain data integrity, especially for operations that require multiple related database changes. Transactions ensure that either all operations complete successfully or none of them do (atomicity), maintaining the database in a consistent state.

### Key Features of Transaction Implementation

- **Atomic Operations**: Creating a protein with its fragments or creating a fragment with its motifs are handled as atomic operations using transactions.
- **Error Handling**: If any part of a transactional operation fails, the entire transaction is rolled back, preventing partial updates.
- **Data Consistency**: Ensures related data (like proteins and their fragments) remain in sync.

### Implementation Details

The API uses a transaction helper function that manages the transaction lifecycle:

```javascript
// Example of the transaction helper function
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

This pattern is used in critical operations such as:

1. **Creating a new protein**:
   ```javascript
   return db.withTransaction(async (client) => {
     // Insert protein record
     const proteinResult = await client.query(/* ... */);
     
     // Fragment the sequence and store fragments
     await fragmentAndStoreSequence(client, proteinId, proteinData.sequence);
     
     return { /* result */ };
   });
   ```

2. **Creating a new fragment**:
   ```javascript
   return db.withTransaction(async (client) => {
     // Insert fragment
     const result = await client.query(/* ... */);
     
     // Insert related motifs
     for (const motif of motifs) {
       await client.query(/* ... */);
     }
     
     return { /* result */ };
   });
   ```

Using transactions ensures that the database remains in a consistent state even if errors occur during complex operations.

## Error Handling

The Protein API implements a robust error handling system to gracefully manage both application-level and database-specific errors, providing meaningful feedback to clients.

### Custom Error Classes

The API implements several custom error classes to handle different types of errors:

- **NotFoundError**: For resources that don't exist (404)
- **ValidationError**: For invalid input data (400)
- **UnauthorizedError**: For authentication issues (401)

These classes are used throughout the application to provide consistent error responses.

### Database Error Handling

Database operations are wrapped in try-catch blocks to handle PostgreSQL-specific errors:

```javascript
try {
  const result = await db.query('SELECT * FROM proteins WHERE protein_id = $1', [proteinId]);
  if (result.rows.length === 0) {
    throw new NotFoundError(`Protein with id ${proteinId} not found`);
  }
  return result.rows[0];
} catch (error) {
  // Check for specific PostgreSQL error codes
  if (error.code === '23505') { // Unique violation
    throw new ValidationError('A protein with this name already exists');
  } else if (error.code === '23503') { // Foreign key violation
    throw new ValidationError('Referenced resource does not exist');
  } else if (error.code === '23514') { // Check constraint violation
    throw new ValidationError('Data violates check constraints');
  }
  
  // Log the original error for debugging
  console.error('Database error:', error);
  
  // Rethrow as a generic error if it's not already a custom error
  if (!(error instanceof NotFoundError || error instanceof ValidationError)) {
    throw new Error('Database operation failed');
  }
  throw error;
}
```

### Common PostgreSQL Error Codes

The API handles these PostgreSQL-specific error codes:

| Code   | Name                    | Description                         | API Response                       |
|--------|-------------------------|-------------------------------------|-----------------------------------|
| 23505  | unique_violation        | Unique constraint violated          | 400 Bad Request                    |
| 23503  | foreign_key_violation   | Referenced entity doesn't exist     | 400 Bad Request                    |
| 23514  | check_violation         | Check constraint failed             | 400 Bad Request                    |
| 42P01  | undefined_table         | Table doesn't exist                 | 500 Internal Server Error          |
| 42703  | undefined_column        | Column doesn't exist                | 500 Internal Server Error          |
| 08006  | connection_failure      | Connection failure                  | 500 Internal Server Error          |

### Global Error Handling Middleware

All unhandled errors are captured by a global error handling middleware that:

1. Logs the error for debugging
2. Sends an appropriate HTTP status code
3. Returns a JSON response with an error message
4. Hides sensitive details in production

This ensures that clients always receive a proper response, even when unexpected errors occur.

## Performance Considerations

The Protein API is designed with performance in mind, implementing several strategies to ensure efficient database operations and API responses.

### Database Optimizations

#### Indexing Strategy

The database schema includes carefully selected indexes to speed up common queries:

- Primary keys are automatically indexed (`protein_id`, `fragment_id`)
- Foreign keys are indexed to optimize joins (`fragments.protein_id`, `motifs.fragment_id`)
- Additional indexes on frequently queried fields (`proteins.name`)

```sql
-- Key indexes in the schema
CREATE INDEX idx_fragments_protein_id ON fragments(protein_id);
CREATE INDEX idx_motifs_fragment_id ON motifs(fragment_id);
CREATE INDEX idx_proteins_name ON proteins(name);
```

#### Efficient Queries

- **Parameterized Queries**: All database operations use parameterized queries to prevent SQL injection and enable query plan caching
- **Joins Over Multiple Queries**: The API uses database joins to retrieve related data in a single query when possible
- **JSONB Data Type**: Structured data like motifs and confidence scores are stored as JSONB, allowing for efficient storage and querying of complex data

### API Optimizations

#### Pagination

The API implements pagination for endpoints that might return large datasets:

```
GET /api/proteins?limit=10&offset=0
```

This prevents performance issues when dealing with large result sets and reduces memory usage.

#### Selective Field Retrieval

When retrieving data, the API only selects the fields that are needed for the current operation, reducing the amount of data transferred from the database.

#### Connection Pooling

The application uses connection pooling to efficiently manage database connections, reducing the overhead of creating new connections for each request.

### Monitoring and Performance Tuning

- **Query Logging**: Detailed logging of slow queries for identification of performance bottlenecks
- **Transaction Management**: Careful management of transaction scopes to minimize lock contention
- **Error Tracking**: Comprehensive error tracking to quickly identify and resolve issues

These performance considerations ensure that the API remains responsive and efficient, even as the database grows in size.

## Screenshots

- Main visualization interface: http://localhost:3000/
- Fragment analysis interface: http://localhost:3000/fragments
- API documentation: http://localhost:3000/api

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm (comes with Node.js)
- Modern web browser (Chrome, Firefox, Safari)

## Setup Instructions

### 1. Database Setup

First, you need to set up PostgreSQL and create a database:

```bash
# Install PostgreSQL (if not already installed)
# For macOS using Homebrew:
brew install postgresql@14
brew services start postgresql@14

# Create a new user and database
createuser -s edhenry  # Replace 'edhenry' with your system username
createdb protein_db

# Test PostgreSQL connection
psql -d protein_db
```

### 2. Environment Configuration

1. Update the `.env` file with your PostgreSQL credentials:

```env
PORT=3000
MAX_PROTEIN_LENGTH=2000
BASE_URL=http://localhost:3000

# PostgreSQL Configuration
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=protein_db
PG_USER=edhenry     # Replace with your system username
PG_PASSWORD=        # Leave empty if using system user authentication
```

### 3. Application Setup

```bash
# Install dependencies
npm install

# Initialize database schema
psql -d protein_db -f schema.sql

# Create required data directories
mkdir -p data/sequences

# If updating an existing installation, run the migration script:
npm run migrate-db

# Start the server
npm start
```

Once the server is running, you should see:
```
PostgreSQL connection successful. Server time: [timestamp]
Server running on port 3000
API documentation available at http://localhost:3000/api
Main visualization interface at http://localhost:3000/
Fragment analysis interface at http://localhost:3000/fragments
```

## Web Interfaces

The application provides two main web interfaces:

### 1. Main Visualization Interface

- **URL**: http://localhost:3000/
- **Features**:
  - List all proteins in the database
  - Create new proteins
  - View protein details
  - Visualize secondary structure predictions
  - Delete proteins
  - Update protein information

### 2. Fragment Analysis Interface

- **URL**: http://localhost:3000/fragments
- **Features**:
  - Browse protein fragments
  - Analyze motif patterns
  - View confidence scores
  - Compare fragment structures

## API Documentation

The API requires authentication via the `X-User-ID` header. Available endpoints:

### Authentication

All requests require the `X-User-ID` header. Use one of these IDs:
- `admin-user-001` (admin access)
- `user-001` (basic access)

### Authentication Implementation

The API uses a simple header-based authentication mechanism:

1. **Authentication Middleware**:
   - Every API request passes through middleware that checks for the `X-User-ID` header
   - If missing, a 401 Unauthorized response is returned
   - The middleware attaches the user information to the request object for downstream handlers

```javascript
// Example middleware implementation
function authenticateUser(req, res, next) {
  const userId = req.header('X-User-ID');
  
  if (!userId) {
    return next(new UnauthorizedError('Authentication required. Please provide X-User-ID header.'));
  }
  
  // Attach user information to the request
  req.user = {
    id: userId
  };
  
  next();
}
```

2. **Making Authenticated Requests**:
   - All requests must include the `X-User-ID` header
   - Example using curl:
     ```bash
     curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins
     ```
   - Example using JavaScript:
     ```javascript
     fetch('http://localhost:3000/api/proteins', {
       headers: {
         'X-User-ID': 'admin-user-001'
       }
     })
     ```

### Data Types and Formats

The API uses the following data structures in responses:

#### Protein Object

```json
{
  "proteinId": "6df5ba03-59d0-4d2d-868a-f847d5f9ceca",  // UUID string
  "name": "Hemoglobin Alpha",                           // String (1-100 chars)
  "description": "Human hemoglobin subunit alpha",      // String (0-1000 chars, optional)
  "molecularWeight": 7060.98,                           // Positive float
  "sequenceLength": 66,                                 // Integer
  "createdAt": "2025-03-25T20:44:20.530Z",              // ISO 8601 date-time
  "updatedAt": "2025-03-25T20:44:20.530Z",              // ISO 8601 date-time
  "sequenceUrl": "http://localhost:3000/api/proteins/6df5ba03-59d0-4d2d-868a-f847d5f9ceca/sequence" // URL
}
```

#### Fragment Object

```json
{
  "fragmentId": "f1f5f795-45ce-4b73-b25c-9d82071b4d28", // UUID string
  "proteinId": "6df5ba03-59d0-4d2d-868a-f847d5f9ceca",  // UUID string
  "sequence": "MVLSPADKTNVKAAW",                        // String (2-50 chars, A-Z)
  "startPosition": 1,                                   // Integer
  "endPosition": 15,                                    // Integer
  "secondaryStructure": "HEECCHCHECEHHHE",              // String (H, E, or C)
  "confidenceScores": [0.4, 0.64, 0.09, 0.62, 1.0],     // Array of numbers (0-1)
  "motifs": [                                           // Array of motif objects
    {
      "type": "Casein_kinase_II_phosphorylation",
      "pattern": "SPAD",
      "description": "Casein kinase II phosphorylation site",
      "startPosition": 4,
      "endPosition": 7
    }
  ],
  "createdAt": "2025-03-25T20:44:20.530Z",              // ISO 8601 date-time
  "url": "http://localhost:3000/api/fragments/f1f5f795-45ce-4b73-b25c-9d82071b4d28" // URL
}
```

#### API Response Transformation

While the database stores motifs and fragments in separate tables (normalized data), the API response combines this information into a denormalized structure for client convenience. When retrieving fragment data, the API automatically:

1. Joins fragment and motif data
2. Transforms database column names to camelCase
3. Formats date-time fields to ISO 8601
4. Converts string-encoded JSON to native objects (for motifs and confidence scores)

This transformation ensures clients receive consistent, easy-to-use data structures regardless of the underlying storage implementation.

### Endpoints

- `GET /api/proteins` - List all proteins with pagination
- `GET /api/proteins/search` - Search proteins by various criteria
- `GET /api/proteins/:proteinId` - Get specific protein
- `POST /api/proteins` - Create new protein
- `POST /api/proteins/sequence` - Create a protein from plain text sequence
- `PUT /api/proteins/:proteinId` - Update a protein
- `DELETE /api/proteins/:proteinId` - Delete a protein
- `GET /api/proteins/:proteinId/structure` - Get predicted secondary structure
- `GET /api/proteins/:proteinId/sequence` - Get protein sequence in FASTA format
- `GET /api/proteins/:proteinId/motifs` - Get motifs in a protein
- `GET /api/proteins/:proteinId/fragments` - Get protein fragments
- `GET /api/fragments/:fragmentId` - Get a specific fragment
- `GET /api/fragments/:fragmentId/visualization` - Visualize a specific fragment
- `POST /api/fragments` - Create a new fragment

## Testing the Application

### Testing the API with curl

```bash
# List all proteins
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins

# Create a new protein
curl -X POST \
  -H "X-User-ID: admin-user-001" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Protein", "sequence": "MVKVGVNGFGRIGRLVTRAAFNSGKVDIVAINDPFIDLNYMVYMFQYDSTHGKFHGTVKAENGKLVINGNPITIFQERDPSKIKWGDAGAEYVVESTGVFTTMEKAGAHLQGGAKRVIISAPSADAPMFVMGVNHEKYDNSLKIISNASCTTNCLAPLAKVIHDNFGIVEGLMTTVHAITATQKTVDGPSGKLWRDGRGALQNIIPASTGAAKAVGKVIPELNGKLTGMAFRVPTANVSVVDLTCRLEKPAKYDDIKKVVKQASEGPLKGILGYTEHQVVSSDFNSDTHSSTFDAGAGIALNDHFVKLISWYDNEFGYSNRVVDLMAHMASKE"}' \
  http://localhost:3000/api/proteins

# Search for proteins with glycosylation sites
curl -H "X-User-ID: admin-user-001" \
  "http://localhost:3000/api/proteins/search?motif=N-glycosylation"

# Search for proteins with molecular weight between 15-20 kDa
curl -H "X-User-ID: admin-user-001" \
  "http://localhost:3000/api/proteins/search?molecularWeight[gte]=15000&molecularWeight[lt]=20000"

# Search for proteins with "glob" in the name, sorted by sequence length
curl -H "X-User-ID: admin-user-001" \
  "http://localhost:3000/api/proteins/search?name=glob&sort=sequenceLength:desc"

# Get information about a specific protein
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins/[protein-id]

# Get protein structure prediction
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins/[protein-id]/structure

# Get protein sequence in FASTA format
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins/[protein-id]/sequence

# Get protein fragments
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins/[protein-id]/fragments

# Get a specific fragment
curl -H "X-User-ID: admin-user-001" http://localhost:3000/api/fragments/[fragment-id]

# Delete a protein
curl -X DELETE -H "X-User-ID: admin-user-001" http://localhost:3000/api/proteins/[protein-id]
```

### Testing the Web Interface

1. Open http://localhost:3000/ in your browser
2. Create a new protein:
   - Click "Add New Protein"
   - Fill in the name and sequence (or paste a FASTA sequence)
   - Click "Create Protein"
3. View protein details:
   - Click on a protein in the list
   - Explore the structure visualization
4. Test the fragments interface:
   - Navigate to http://localhost:3000/fragments
   - Select a protein to view its fragments

## Troubleshooting

1. If you see "role 'postgres' does not exist":
   - Update the `.env` file to use your system username instead of 'postgres'
   - Or create a postgres user: `createuser -s postgres`

2. If you can't connect to the database:
   - Ensure PostgreSQL is running: `brew services list`
   - Check your `.env` configuration
   - Verify database exists: `psql -l`

3. If you encounter "Transaction errors":
   - Ensure the database module includes the `withTransaction` function

4. If the web interface doesn't load properly:
   - Check browser console for errors
   - Ensure all API endpoints are working correctly
   - Verify that the `data/sequences` directory exists

5. If you encounter motif confidence score errors:
   - Run the migration script: `npm run migrate-db`
   - This will update the database schema and fix the constraint issues

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Visualization**: D3.js
- **Sequence Analysis**: Custom GOR algorithm implementation

## Directory Structure

```
protein-api/
├── src/                  # Server-side code
│   ├── routes/           # API route definitions
│   ├── models/           # Data access and business logic
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utility functions
│   │   ├── gorAlgorithm.js # Secondary structure prediction
│   │   └── motifFinder.js  # Sequence motif detection
│   └── server.js         # Express application setup
├── public/               # Web interface files
│   ├── js/               # JavaScript for web interface
│   │   ├── main.js       # Main visualization interface
│   │   └── fragments.js  # Fragment analysis interface
│   ├── index.html        # Main visualization page
│   ├── fragments.html    # Fragment analysis page
│   └── styles.css        # CSS styles
├── data/                 # Data storage
│   └── sequences/        # Protein sequence files
├── scripts/              # Helper scripts
│   ├── migrate_db.js     # Database migration script
│   └── update_schema.sql # SQL schema updates
├── schema.sql            # Database schema definition
├── .env                  # Environment configuration
├── package.json          # NPM dependencies
└── index.js              # Application entry point
``` 