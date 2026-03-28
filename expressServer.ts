/**
 * Express.js Backend Integration for PrajaVaani Eligibility Checker
 * 
 * This is a sample Express server showing how to integrate the eligibility checker module.
 * Install dependencies: npm install express cors
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import db, { runQuery, getQuery } from './database';
import { checkEligibility, UserProfile, EligibilityResult } from './eligibilityChecker';

const app = express();
const googleClient = new OAuth2Client('652104115401-rn4orju05i3d48jitnfck7l04uu60q6o.apps.googleusercontent.com');
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// Enable CORS for frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Parse JSON request bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== ROUTES ====================

/**
 * POST /api/register
 * Register a new user
 */
app.post('/api/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const existingUser = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await runQuery('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
    const newUser = await getQuery('SELECT id, name, email, created_at FROM users WHERE email = ?', [email]);

    res.status(201).json({ success: true, user: newUser });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/login
 * Log in an existing user
 */
app.post('/api/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Missing email or password' });
      return;
    }

    const user = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !user.password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Return user without password
    const { password: _, ...userData } = user;
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/google-login
 * Verify Google Token and log in or register user
 */
app.post('/api/google-login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'No token provided' });
      return;
    }

    // Verify token with placeholder client id, or skip if placeholder. 
    // We will attempt local decode if client ID is placeholder for demo purposes, 
    // but normally we use verifyIdToken.
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: '652104115401-rn4orju05i3d48jitnfck7l04uu60q6o.apps.googleusercontent.com',
      });
      payload = ticket.getPayload();
    } catch (e) {
      // If verification fails (e.g., due to placeholder client ID),
      // Decode the JWT token directly for demonstration purposes.
      // WARNING: This is INSECURE and ONLY for demonstration without a real client ID.
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      payload = JSON.parse(jsonPayload);
    }

    if (!payload || !payload.email) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    const { sub: google_id, email, name } = payload;

    // Find existing user
    let user = await getQuery('SELECT * FROM users WHERE email = ?', [email]);

    if (user) {
      if (!user.google_id) {
        // Link account if registering via email previously
        await runQuery('UPDATE users SET google_id = ? WHERE id = ?', [google_id, user.id]);
      }
    } else {
      // Register new user
      await runQuery('INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)', [name || 'Google User', email, google_id]);
      user = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
    }

    const { password: _, ...userData } = user;
    res.json({ success: true, user: userData });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Eligibility Checker API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/check-eligibility
 * Main eligibility checking endpoint
 * 
 * Request body: UserProfile object
 * Response: Array of EligibilityResult objects
 */
app.post('/api/check-eligibility', (req: Request, res: Response): void => {
  try {
    const userProfile: UserProfile = req.body;

    // Validate required fields
    if (!userProfile || typeof userProfile !== 'object') {
      res.status(400).json({
        error: 'Invalid request body. Expected a user profile object.',
      });
      return;
    }

    // Get the dataset path
    const datasetPath = path.join(__dirname, 'schemes_dataset.json');

    // Run eligibility check
    const results: EligibilityResult[] = checkEligibility(userProfile, datasetPath);

    // Separate eligible and ineligible schemes (>= 60% confidence are considered eligible enough to show)
    const eligibleSchemes = results.filter(r => r.eligible || r.confidence >= 0.60);
    const ineligibleSchemes = results.filter(r => !r.eligible && r.confidence < 0.60);

    // Sort by confidence score (highest first)
    eligibleSchemes.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    ineligibleSchemes.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    res.json({
      success: true,
      summary: {
        total_schemes_checked: results.length,
        eligible_count: eligibleSchemes.length,
        ineligible_count: ineligibleSchemes.length,
      },
      results: {
        eligible: eligibleSchemes,
        ineligible: ineligibleSchemes,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while checking eligibility',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/check-single-scheme
 * Check eligibility for a specific scheme
 * 
 * Request body: { userProfile: UserProfile, schemeId: string }
 * Response: Single EligibilityResult
 */
app.post('/api/check-single-scheme', (req: Request, res: Response): void => {
  try {
    const { userProfile, schemeId } = req.body;

    if (!userProfile || !schemeId) {
      res.status(400).json({
        error: 'Missing required fields: userProfile and schemeId',
      });
      return;
    }

    const datasetPath = path.join(__dirname, 'schemes_dataset.json');
    const results = checkEligibility(userProfile, datasetPath);
    const schemeResult = results.find(r => r.id === schemeId);

    if (!schemeResult) {
      res.status(404).json({
        error: `Scheme with ID '${schemeId}' not found`,
      });
      return;
    }

    res.json({
      success: true,
      result: schemeResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking scheme:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/schemes
 * Get list of all available schemes
 */
app.get('/api/schemes', (req: Request, res: Response) => {
  try {
    const datasetPath = path.join(__dirname, 'schemes_dataset.json');
    const fs = require('fs');
    const fileContent = fs.readFileSync(datasetPath, 'utf-8');
    const schemes = JSON.parse(fileContent);

    const schemesList = schemes.map((scheme: any) => ({
      id: scheme.id,
      title: scheme.title,
      government: scheme.government,
      category: scheme.category,
      description: scheme.description,
      status: scheme.status || 'active',
    }));

    res.json({
      success: true,
      total_schemes: schemesList.length,
      schemes: schemesList,
    });
  } catch (error) {
    console.error('Error fetching schemes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch schemes',
    });
  }
});

/**
 * POST /api/batch-check
 * Check eligibility for multiple users at once
 * 
 * Request body: { users: UserProfile[] }
 * Response: Array of { userId/index, results: EligibilityResult[] }
 */
app.post('/api/batch-check', (req: Request, res: Response): void => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({
        error: 'Invalid request. Expected array of user profiles.',
      });
      return;
    }

    const datasetPath = path.join(__dirname, 'schemes_dataset.json');
    const batchResults = users.map((user, index) => ({
      user_index: index,
      results: checkEligibility(user, datasetPath),
    }));

    res.json({
      success: true,
      total_users: users.length,
      batch_results: batchResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in batch check:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during batch processing',
    });
  }
});

/**
 * POST /api/check-fake-scheme
 * Evaluates the given text against the ML model to check for scams.
 * 
 * Request body: { text: string }
 * Response: { risk_score: number, label: string, detected_patterns: string[] }
 */
app.post('/api/check-fake-scheme', (req: Request, res: Response): void => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Valid text is required' });
      return;
    }

    const scriptPath = path.join(__dirname, 'ml_pipeline', 'predict.py');
    const { execFile } = require('child_process');

    // Call the Python script with the text as an argument
    execFile('python', [scriptPath, text], { encoding: 'utf8' }, (error: any, stdout: string, stderr: string): void => {
      if (error) {
        console.error('Python execution error:', error.message);
        console.error('Python stderr:', stderr);
        res.status(500).json({ error: 'Failed to evaluate text', details: stderr });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        // If predict.py throws a handled error internally
        if (result.error) {
          res.status(500).json({ error: result.error });
          return;
        }
        res.json({
          success: true,
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (parseError) {
        console.error('Failed to parse Python output:', stdout);
        res.status(500).json({ error: 'Invalid response from ML model' });
      }
    });
  } catch (error) {
    console.error('Error in check-fake-scheme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

// ==================== SERVER STARTUP ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║       PrajaVaani Eligibility Checker API Server       ║
╚════════════════════════════════════════════════════════╝

Server running at: http://localhost:${PORT}
Environment: ${process.env.NODE_ENV || 'development'}

Available endpoints:
  GET  /api/health                    - Health check
  GET  /api/schemes                   - List all schemes
  POST /api/check-eligibility         - Check all schemes for user
  POST /api/check-single-scheme       - Check single scheme
  POST /api/batch-check               - Check multiple users

Documentation:
  See expressServer.ts for detailed endpoint specifications
`);
});

export default app;
