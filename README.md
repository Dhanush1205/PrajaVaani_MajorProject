# PrajaVaani Eligibility Checker Module

A complete, modular TypeScript/JavaScript implementation for checking eligibility of users across Indian government welfare, agriculture, and social schemes.

## 🚀 How to Run Locally

If you're setting up the project for the first time or on a new machine, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/Dhanush1205/PrajaVaani.git
cd PrajaVaani
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Backend Server
```bash
npm run server
```
*(Keep this terminal open and running on port 5000)*

### 4. Start the Frontend Server
Open a **new terminal** and run:
```bash
python -m http.server 8080
```

### 5. Access the App
Open your browser and go to: [http://localhost:8080](http://localhost:8080)

---

## Overview

The Eligibility Checker evaluates user profiles against a comprehensive dataset of government schemes and returns:
- Which schemes the user is eligible for
- Confidence scores (0-1 scale) for each match
- Required documents for eligible schemes
- Detailed reasons for ineligibility

## Features

✅ **Comprehensive Criteria Handling**
- Age, gender, caste/category checks
- Income verification (rural/urban/nested categories)
- Occupation and professional status validation
- Land ownership and property checks
- Education and student status
- BPL/APL and ration card verification
- Specialized flags (farmer, artisan, weaver, SHG member, etc.)

✅ **Intelligent Confidence Scoring**
- Weight-based calculation matching user attributes to scheme requirements
- Normalized scores (0-1 range) with 2-decimal precision
- Confidence mapping for different criteria types

✅ **Flexible Integration**
- Works with Node.js/Express backends
- Compatible with React/Next.js frontends
- Standalone module with no external dependencies (except fs for file I/O)
- Both CommonJS and ES6 module exports

✅ **Error Handling**
- Graceful handling of missing fields
- Discontinued scheme detection
- Unknown criteria keys are skipped safely
- Comprehensive error messages

---

## Installation

### Option 1: Direct Integration (Recommended for Startups)

1. **Copy the module files to your project:**

```bash
# Copy to a backend project
cp eligibilityChecker.ts path/to/your/backend/src/

# Copy dataset
cp schemes_dataset.json path/to/your/backend/src/
```

2. **No additional dependencies needed** - The module uses only `fs` (Node.js built-in)

### Option 2: npm Package (If Publishing)

```bash
npm install prajavaani-eligibility-checker
```

---

## Quick Start

### 1. Node.js Backend

```typescript
import { checkEligibility, UserProfile } from './eligibilityChecker';

// Create a user profile
const user: UserProfile = {
  age: 24,
  gender: 'Female',
  state: 'Telangana',
  caste: 'BC',
  annual_income: 180000,
  is_farmer: false,
  is_student: false,
  ration_card: 'White',
  is_bpl: false,
};

// Check eligibility
const results = checkEligibility(user);

// Get eligible schemes
const eligible = results.filter(r => r.eligible);
console.log(`User is eligible for ${eligible.length} schemes`);

// Sort by confidence
const topSchemes = eligible.sort((a, b) => 
  (b.confidence || 0) - (a.confidence || 0)
);

topSchemes.forEach(scheme => {
  console.log(`${scheme.title}: ${scheme.confidence * 100}% match`);
});
```

### 2. Express.js Backend (Complete Server)

```typescript
import express from 'express';
import { checkEligibility } from './eligibilityChecker';

const app = express();
app.use(express.json());

app.post('/api/check-eligibility', (req, res) => {
  try {
    const results = checkEligibility(req.body);
    const eligible = results.filter(r => r.eligible);
    
    res.json({
      success: true,
      eligible_count: eligible.length,
      total_schemes: results.length,
      schemes: eligible,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000);
```

### 3. React/Next.js Frontend

```typescript
import { useState } from 'react';

interface UserProfile {
  age?: number;
  gender?: string;
  state?: string;
  caste?: string;
  annual_income?: number;
  // ... other fields
}

export function EligibilityChecker() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: UserProfile) => {
    setLoading(true);
    try {
      const response = await fetch('/api/check-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      const eligible = data.results.eligible
        .sort((a: any, b: any) => b.confidence - a.confidence);
      
      setResults(eligible);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Form component to collect user data */}
      {results.map(scheme => (
        <div key={scheme.id}>
          <h3>{scheme.title}</h3>
          <p>Match: {(scheme.confidence * 100).toFixed(1)}%</p>
          <ul>
            {scheme.required_documents.map(doc => (
              <li key={doc}>{doc}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

---

## API Reference

### `checkEligibility(userProfile: UserProfile, dataPath?: string): EligibilityResult[]`

Main function that checks eligibility across all schemes.

**Parameters:**
- `userProfile`: User data object with demographic/socioeconomic information
- `dataPath`: (Optional) Path to schemes_dataset.json

**Returns:** Array of EligibilityResult objects

**Example:**
```typescript
const results = checkEligibility({
  age: 35,
  state: 'Telangana',
  caste: 'SC',
  annual_income: 150000,
  is_farmer: true,
});
```

### `evaluateScheme(user: UserProfile, scheme: Scheme): EligibilityResult`

Evaluate a single scheme for a user.

**Returns:** Single EligibilityResult

```typescript
import { evaluateScheme, loadSchemes } from './eligibilityChecker';

const schemes = loadSchemes();
const result = evaluateScheme(user, schemes[0]);
```

### `loadSchemes(dataPath?: string): Scheme[]`

Load all schemes from the JSON dataset.

**Returns:** Array of Scheme objects

```typescript
const allSchemes = loadSchemes();
console.log(`Total schemes: ${allSchemes.length}`);
```

---

## Data Structures

### UserProfile

```typescript
interface UserProfile {
  // Demographics
  age?: number;
  gender?: string; // 'Male', 'Female'
  state?: string; // 'Telangana', 'Karnataka', etc.
  caste?: string; // 'SC', 'ST', 'BC', 'OBC', 'EBC', 'General', etc.
  
  // Financial
  annual_income?: number;
  is_bpl?: boolean;
  is_taxpayer?: boolean;
  
  // Occupation
  is_farmer?: boolean;
  is_tenant_farmer?: boolean;
  is_land_owner?: boolean;
  max_land_size_acres?: number;
  occupation?: string;
  
  // Education & Employment
  is_student?: boolean;
  is_unemployed?: boolean;
  is_not_full_time_employed?: boolean;
  min_attendance_percent?: number;
  
  // Lifestyle indicators
  units_consumed?: number; // Electricity
  ration_card?: string; // 'White', 'Yellow', 'Red'
  already_has_lpg?: boolean;
  own_house?: boolean;
  suitable_rooftop?: boolean;
  
  // Specific schemes
  is_weaver?: boolean;
  is_shg_member?: boolean; // Self-Help Group
  is_artisan?: boolean;
  is_fisherman?: boolean;
  is_unorganized_worker?: boolean;
  
  // Special statuses
  is_govt_employee?: boolean;
  senior_citizen_above_70?: boolean;
  is_mother?: boolean;
  homeless?: boolean;
  is_in_targeted_district?: boolean;
  is_institutional_holder?: boolean;
  
  // Allow additional properties
  [key: string]: any;
}
```

### EligibilityResult

```typescript
interface EligibilityResult {
  id: string;                      // Unique scheme identifier
  title: string;                   // Scheme name
  government: string;              // 'Telangana', 'Central', etc.
  category: string;                // 'Welfare', 'Agriculture', etc.
  eligible: boolean;               // Is user eligible?
  confidence: number;              // 0-1, match strength
  missing_criteria: string[];      // Why ineligible
  required_documents: string[];    // Documents needed if eligible
}
```

### Scheme (from JSON)

```typescript
interface Scheme {
  id: string;
  title: string;
  government: string;
  category: string;
  description: string;
  benefits: string;
  status?: 'active' | 'discontinued';
  criteria: {
    // Age criteria
    min_age?: number;
    max_age?: number;
    
    // Gender & demographics
    gender?: string;
    state_resident?: string;
    categories?: string[];
    
    // Income (multiple formats)
    max_income?: number;
    max_income_rural?: number;
    max_income_urban?: number;
    income_limits?: {
      sc_st?: number;
      bc_ebc_minority_rural?: number;
      bc_ebc_minority_urban?: number;
      disabled?: number;
      general?: number;
    };
    
    // Boolean flags
    [key: string]: any;
  };
  documents: string[];
  confidence_weight: { [key: string]: number };
}
```

---

## Express Server Integration

The project includes a complete Express server example (`expressServer.ts`):

### Setup

```bash
npm install express cors
npx tsc expressServer.ts eligibilityChecker.ts
node expressServer.js
```

### Available Endpoints

#### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Eligibility Checker API is running",
  "timestamp": "2026-02-22T10:30:00Z"
}
```

#### POST /api/check-eligibility
Check eligibility for all schemes.

**Request:**
```json
{
  "age": 24,
  "gender": "Female",
  "state": "Telangana",
  "caste": "BC",
  "annual_income": 180000,
  "ration_card": "White",
  "is_bpl": false
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_schemes_checked": 45,
    "eligible_count": 8,
    "ineligible_count": 37
  },
  "results": {
    "eligible": [
      {
        "id": "ts-kalyana-lakshmi",
        "title": "Kalyana Lakshmi",
        "government": "Telangana",
        "category": "Welfare",
        "eligible": true,
        "confidence": 0.87,
        "required_documents": ["Aadhaar Card", "Birth Certificate", "..."]
      }
    ],
    "ineligible": []
  }
}
```

#### POST /api/check-single-scheme
Check one specific scheme.

**Request:**
```json
{
  "userProfile": { /* UserProfile object */ },
  "schemeId": "ts-kalyana-lakshmi"
}
```

#### GET /api/schemes
List all available schemes.

#### POST /api/batch-check
Check eligibility for multiple users.

**Request:**
```json
{
  "users": [
    { /* UserProfile 1 */ },
    { /* UserProfile 2 */ }
  ]
}
```

---

## Criteria Evaluation Logic

### Age
```
✓ If user's age >= min_age AND <= max_age
```

### Income
Three formats supported:
1. **Simple limit:** `max_income: 200000`
2. **Rural/Urban:** `max_income_rural: 150000`, `max_income_urban: 200000`
3. **Caste-based:** `income_limits: { sc_st: 250000, bc_rural: 150000, ... }`

### Categories (Caste/Community)
```
✓ If user.caste is IN criteria.categories array
   (case-insensitive, substring matching)
```

### Boolean Flags
```
✓ If criteria.is_farmer === true, user.is_farmer must be true
✓ If criteria.is_taxpayer === false, user.is_taxpayer must be false
```

### Ration Card
```
✓ If criteria.ration_card_required: "White", 
   user.ration_card must be "White"
```

### Confidence Score Calculation

Confidence = (Sum of weights where criteria match) / (Total weight sum)

Example:
```json
{
  "confidence_weight": {
    "income": 0.4,
    "caste": 0.3,
    "age": 0.3
  }
}
```

If user age passes: +0.3
If user caste matches: +0.3
If user income fits: +0.4
**Total: 1.0 (100% confidence)**

---

## Testing

### Run Examples

```bash
npx ts-node usageExamples.ts
```

This runs 8 comprehensive examples:
1. Basic eligibility check
2. Filtered results by government & category
3. Top matching schemes
4. Detailed eligibility analysis
5. Compare multiple users
6. Export results to JSON
7. API response formatting
8. Error handling & edge cases

### Unit Testing (Custom)

```typescript
import { checkEligibility } from './eligibilityChecker';

function testScenario(name: string, user: UserProfile, expectEligible: boolean) {
  const results = checkEligibility(user);
  const isEligible = results.some(r => r.eligible && r.confidence > 0.5);
  
  if (isEligible === expectEligible) {
    console.log(`✓ ${name}`);
  } else {
    console.error(`✗ ${name}`);
  }
}

// Test cases
testScenario('Farmer from Telangana', farmerUser, true);
testScenario('Student from Karnataka', studentUser, false);
testScenario('BPL woman', womanUser, true);
```

---

## Performance Considerations

- **Speed:** ~50-100ms for full eligibility check on 40+ schemes
- **Memory:** ~2-3MB for loaded scheme dataset
- **Scalability:** Linear O(n) where n = number of schemes
- **Optimization for RapidAPI/High Volume:**
  - Cache loaded schemes
  - Use batch endpoints
  - Implement result caching by user profile hash

### Optimization Example

```typescript
let schemesCache: Scheme[] | null = null;

function optimizedCheckEligibility(user: UserProfile) {
  if (!schemesCache) {
    schemesCache = loadSchemes();
  }

  // Reuse cached schemes
  return schemesCache
    .map(scheme => evaluateScheme(user, scheme))
    .filter(r => r.eligible)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
}
```

---

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY eligibilityChecker.ts expressServer.ts schemes_dataset.json ./
RUN npm install typescript ts-node express cors
CMD ["ts-node", "expressServer.ts"]
```

### AWS Lambda

```typescript
import { checkEligibility } from './eligibilityChecker';

export const handler = async (event) => {
  try {
    const userProfile = JSON.parse(event.body);
    const results = checkEligibility(userProfile);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        results: results.filter(r => r.eligible),
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

### Vercel (Next.js)

```typescript
// pages/api/check-eligibility.ts
import { checkEligibility } from '@/lib/eligibilityChecker';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const results = checkEligibility(req.body);
    res.status(200).json({
      success: true,
      data: results.filter(r => r.eligible),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## Troubleshooting

### Issue: "Cannot find schemes_dataset.json"

**Solution:** Make sure the JSON file is in the same directory as the module, or pass the correct path:

```typescript
checkEligibility(user, '/path/to/schemes_dataset.json');
```

### Issue: User always ineligible

**Solution:** Check if required fields are provided:

```typescript
// Add missing fields
const user = {
  age: 30,
  state: 'Telangana', // Required for most Telangana schemes
  caste: 'BC',
  // ... other fields
};
```

### Issue: Confidence scores very low

**Solution:** Review which criteria are being used in `confidence_weight`:

```typescript
// If income weight is 0.9 but user doesn't have income provided
// -> Confidence will be 0

// Ensure user object has all fields mentioned in confidence_weight keys
```

---

## Contributing & Extending

### Adding a New Criteria Type

1. Update `UserProfile` interface
2. Create a new helper function
3. Add to `validateCriteria()`
4. Update `calculateConfidence()`

```typescript
function checkMyCriteria(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (criteria.my_field === undefined) {
    return { valid: true };
  }
  
  if (!user.my_field) {
    return { valid: false, reason: 'My field not provided' };
  }
  
  if (/* validation logic */) {
    return { valid: true };
  }
  
  return { valid: false, reason: 'Does not meet requirement' };
}
```

---

## License

This module is designed for use in the PrajaVaani project and related Telugu AI web applications. Ensure compliance with data protection regulations when handling user profiles.

---

## Support & Resources

- **Project Repository:** [PrajaVaani Project]
- **Dataset:** `schemes_dataset.json` contains 40+ Indian government schemes
- **Issues/Questions:** Refer to `usageExamples.ts` for common patterns

---

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Compatibility:** Node.js 14+, TypeScript 4.0+, React 16.8+, Next.js 12+
