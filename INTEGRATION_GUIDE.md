# PrajaVaani Eligibility Checker - Integration Guide

A step-by-step guide for integrating the Eligibility Checker module into different platforms and environments.

---

## Table of Contents

1. [Node.js Backend](#nodejs-backend)
2. [Express.js Server](#expressjs-server)
3. [React Frontend](#react-frontend)
4. [Next.js Full Stack](#nextjs-full-stack)
5. [AWS Lambda](#aws-lambda)
6. [Docker Deployment](#docker-deployment)
7. [RapidAPI Integration](#rapidapi-integration)

---

## Node.js Backend

### Setup

```bash
# Initialize project
mkdir my-eligibility-app
cd my-eligibility-app
npm init -y

# Install dependencies
npm install --save-dev typescript ts-node @types/node
npm install express cors
```

### File Structure

```
my-eligibility-app/
├── node_modules/
├── src/
│   ├── eligibilityChecker.ts
│   ├── server.ts
│   └── index.ts
├── schemes_dataset.json
├── package.json
├── tsconfig.json
└── README.md
```

### Basic Usage

```typescript
// src/index.ts
import { checkEligibility, UserProfile } from './eligibilityChecker';

const user: UserProfile = {
  age: 30,
  state: 'Telangana',
  caste: 'BC',
  annual_income: 150000,
  is_farmer: true,
};

const results = checkEligibility(user);
const eligible = results.filter(r => r.eligible);

console.log(`Found ${eligible.length} eligible schemes`);
eligible.forEach(scheme => {
  console.log(`✓ ${scheme.title} (${(scheme.confidence * 100).toFixed(0)}%)`);
});
```

### Run

```bash
npx ts-node src/index.ts
```

---

## Express.js Server

### Full Server Setup

```bash
npm install express cors dotenv
npm install -D @types/express
```

### Server Code

```typescript
// src/server.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import { checkEligibility } from './eligibilityChecker';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Main eligibility endpoint
app.post('/api/check-eligibility', (req, res) => {
  try {
    const userProfile = req.body;
    
    // Get schemes path (adjust as needed)
    const datasetPath = path.join(__dirname, '../schemes_dataset.json');
    
    const results = checkEligibility(userProfile, datasetPath);
    const eligible = results.filter(r => r.eligible);
    
    res.json({
      success: true,
      summary: {
        total: results.length,
        eligible_count: eligible.length,
        ineligible_count: results.length - eligible.length,
      },
      results: {
        eligible: eligible.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
```

### Environment Variables

```bash
# .env
PORT=5000
NODE_ENV=development
```

### Start Server

```bash
# Development with auto-reload
npx ts-node src/server.ts

# Or compile and run
npm run build
node dist/server.js
```

### Test Endpoint

```bash
curl -X POST http://localhost:5000/api/check-eligibility \
  -H "Content-Type: application/json" \
  -d '{
    "age": 24,
    "state": "Telangana",
    "caste": "BC",
    "annual_income": 180000
  }'
```

---

## React Frontend

### Installation

```bash
# Create React app
npx create-react-app prajavaani-checker
cd prajavaani-checker

# Install additional dependencies
npm install axios
```

### Component Structure

```
src/
├── components/
│   ├── EligibilityForm.tsx
│   ├── ResultsList.tsx
│   └── EligibilityChecker.tsx
├── types/
│   └── api.ts
├── services/
│   └── eligibilityService.ts
├── App.tsx
└── styles/
    └── EligibilityChecker.css
```

### Types

```typescript
// src/types/api.ts
export interface UserProfile {
  age?: number;
  gender?: string;
  state?: string;
  caste?: string;
  annual_income?: number;
  is_farmer?: boolean;
  is_student?: boolean;
  [key: string]: any;
}

export interface SchemeResult {
  id: string;
  title: string;
  government: string;
  category: string;
  eligible: boolean;
  confidence: number;
  required_documents: string[];
}
```

### Service

```typescript
// src/services/eligibilityService.ts
import axios from 'axios';
import { UserProfile, SchemeResult } from '../types/api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const eligibilityService = {
  async checkEligibility(user: UserProfile): Promise<SchemeResult[]> {
    const response = await axios.post(
      `${API_BASE}/api/check-eligibility`,
      user
    );
    return response.data.results?.eligible || [];
  },

  async checkSingleScheme(
    user: UserProfile,
    schemeId: string
  ): Promise<SchemeResult | null> {
    const response = await axios.post(
      `${API_BASE}/api/check-single-scheme`,
      { userProfile: user, schemeId }
    );
    return response.data.result || null;
  },
};
```

### Form Component

```typescript
// src/components/EligibilityForm.tsx
import React, { useState } from 'react';
import { UserProfile } from '../types/api';

interface Props {
  onSubmit: (user: UserProfile) => void;
  loading: boolean;
}

export const EligibilityForm: React.FC<Props> = ({ onSubmit, loading }) => {
  const [user, setUser] = useState<UserProfile>({});

  const handleChange = (field: string, value: any) => {
    setUser(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(user);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        placeholder="Age"
        value={user.age || ''}
        onChange={e => handleChange('age', parseInt(e.target.value))}
      />

      <select
        value={user.state || ''}
        onChange={e => handleChange('state', e.target.value)}
      >
        <option value="">Select State</option>
        <option value="Telangana">Telangana</option>
        <option value="Andhra Pradesh">Andhra Pradesh</option>
      </select>

      {/* More fields... */}

      <button type="submit" disabled={loading}>
        {loading ? 'Checking...' : 'Check Eligibility'}
      </button>
    </form>
  );
};
```

### Main App

```typescript
// src/App.tsx
import React, { useState } from 'react';
import { EligibilityForm } from './components/EligibilityForm';
import { ResultsList } from './components/ResultsList';
import { eligibilityService } from './services/eligibilityService';
import { UserProfile, SchemeResult } from './types/api';

function App() {
  const [results, setResults] = useState<SchemeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckEligibility = async (user: UserProfile) => {
    setLoading(true);
    setError(null);

    try {
      const schemes = await eligibilityService.checkEligibility(user);
      setResults(schemes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>PrajaVaani Eligibility Checker</h1>
      </header>

      <main>
        <EligibilityForm onSubmit={handleCheckEligibility} loading={loading} />

        {error && <div className="error">{error}</div>}

        {results.length > 0 && (
          <ResultsList results={results} />
        )}
      </main>
    </div>
  );
}

export default App;
```

### Environment Setup

```bash
# .env
REACT_APP_API_URL=http://localhost:5000
```

### Start App

```bash
npm start
```

---

## Next.js Full Stack

### Project Setup

```bash
npx create-next-app@latest prajavaani --typescript
cd prajavaani

# Copy module files
cp eligibilityChecker.ts lib/
cp schemes_dataset.json public/
```

### API Route

```typescript
// pages/api/check-eligibility.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkEligibility } from '@/lib/eligibilityChecker';
import path from 'path';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userProfile = req.body;

    // For Next.js, load from public folder
    const datasetPath = path.join(process.cwd(), 'public/schemes_dataset.json');
    const results = checkEligibility(userProfile, datasetPath);

    const eligible = results.filter(r => r.eligible);

    res.status(200).json({
      success: true,
      eligible_count: eligible.length,
      results: {
        eligible: eligible.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

### Page Component

```typescript
// pages/index.tsx
import { useState } from 'react';
import type { NextPage } from 'next';
import { UserProfile, EligibilityResult } from '../types';

const Home: NextPage = () => {
  const [results, setResults] = useState<EligibilityResult[]>([]);
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
      setResults(data.results?.eligible || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>PrajaVaani Eligibility Checker</h1>
      {/* Form and results */}
    </div>
  );
};

export default Home;
```

---

## AWS Lambda

### Serverless Framework Setup

```bash
npm install -g serverless

serverless create --template aws-nodejs-typescript --path prajavaani-serverless
cd prajavaani-serverless
```

### Handler

```typescript
// src/handler.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { checkEligibility } from './eligibilityChecker';

const eligibilityHandler: APIGatewayProxyHandler = async (event) => {
  try {
    const userProfile = JSON.parse(event.body || '{}');
    const results = checkEligibility(userProfile);

    const eligible = results.filter(r => r.eligible);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        eligible_count: eligible.length,
        results: { eligible },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { eligibilityHandler };
```

### Serverless Configuration

```yaml
# serverless.yml
service: prajavaani-eligibility

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1

functions:
  checkEligibility:
    handler: src/handler.eligibilityHandler
    events:
      - http:
          path: /check-eligibility
          method: post
          cors: true

plugins:
  - serverless-plugin-typescript
  - serverless-offline
```

### Deploy

```bash
serverless deploy
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY eligibilityChecker.ts .
COPY expressServer.ts .
COPY schemes_dataset.json .
COPY tsconfig.json .

# Build TypeScript
RUN npm install -g typescript
RUN tsc

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "dist/expressServer.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  eligibility-api:
    build: .
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
    volumes:
      - ./schemes_dataset.json:/app/schemes_dataset.json:ro
```

### Build & Run

```bash
docker build -t prajavaani-eligibility .
docker run -p 5000:5000 prajavaani-eligibility
```

---

## RapidAPI Integration

### Package for RapidAPI

1. **Sign up on RapidAPI**

2. **Create package structure**

```
rapidapi-package/
├── eligibilityChecker.ts
├── expressServer.ts
├── schemes_dataset.json
├── package.json
└── rapidapi.json
```

3. **RapidAPI Config**

```json
{
  "apiName": "PrajaVaani Eligibility Checker",
  "apiVersion": "1.0.0",
  "description": "Check eligibility for Indian government schemes",
  "endpoints": [
    {
      "method": "POST",
      "path": "/check-eligibility",
      "description": "Check user eligibility for all schemes",
      "params": {
        "age": "number",
        "state": "string",
        "caste": "string",
        "annual_income": "number"
      }
    }
  ]
}
```

4. **RapidAPI Handler**

```typescript
// rapidapi-handler.ts
import { checkEligibility } from './eligibilityChecker';

export async function handleRequest(req: any) {
  const userProfile = req.body;

  const results = checkEligibility(userProfile);
  const eligible = results.filter(r => r.eligible);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      success: true,
      eligible_count: eligible.length,
      schemes: eligible.map(scheme => ({
        id: scheme.id,
        title: scheme.title,
        confidence: scheme.confidence,
        documents: scheme.required_documents,
      })),
    }),
  };
}
```

---

## Testing All Integrations

### Sample Test Data

```json
{
  "age": 24,
  "gender": "Female",
  "state": "Telangana",
  "caste": "BC",
  "annual_income": 180000,
  "is_farmer": false,
  "is_student": false,
  "ration_card": "White",
  "is_bpl": false,
  "units_consumed": 120
}
```

### Test Endpoints

```bash
# Local
curl -X POST http://localhost:5000/api/check-eligibility \
  -H "Content-Type: application/json" \
  -d @test-user.json

# Docker
curl -X POST http://localhost:5000/api/check-eligibility \
  -H "Content-Type: application/json" \
  -d @test-user.json

# AWS Lambda
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/prod/check-eligibility \
  -H "Content-Type: application/json" \
  -d @test-user.json
```

---

## Performance Tips

1. **Cache Schemes Data**
   ```typescript
   let cachedSchemes = null;
   function fastCheckEligibility(user) {
     if (!cachedSchemes) {
       cachedSchemes = loadSchemes();
     }
     return cachedSchemes.map(s => evaluateScheme(user, s));
   }
   ```

2. **Use Database for User Profiles**
   ```typescript
   // Cache results by user profile hash
   const userHash = hashUserProfile(user);
   if (cache[userHash]) return cache[userHash];
   ```

3. **Implement Result Pagination**
   ```typescript
   app.post('/api/check-eligibility', (req, res) => {
     const page = req.query.page || 1;
     const limit = 10;
     // ... implement pagination
   });
   ```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module 'fs'` | Ensure you're running in Node.js, not browser |
| `schemes_dataset.json not found` | Check file path and permissions |
| `CORS errors` | Add CORS middleware or headers |
| `Out of memory` | Cache schemes, implement pagination |
| `Slow responses` | Use batch endpoints, optimize queries |

---

## Next Steps

- Review [README.md](./README.md) for full API documentation
- Check [usageExamples.ts](./usageExamples.ts) for code samples
- Explore [EligibilityCheckerComponent.tsx](./EligibilityCheckerComponent.tsx) for React examples
