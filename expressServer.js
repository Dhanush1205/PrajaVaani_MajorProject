"use strict";
/**
 * Express.js Backend Integration for PrajaVaani Eligibility Checker
 *
 * This is a sample Express server showing how to integrate the eligibility checker module.
 * Install dependencies: npm install express cors
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var path_1 = require("path");
var eligibilityChecker_1 = require("./eligibilityChecker");
var app = (0, express_1.default)();
var PORT = process.env.PORT || 5000;
// ==================== MIDDLEWARE ====================
// Enable CORS for frontend
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));
// Parse JSON request bodies
app.use(express_1.default.json());
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname)));
// Request logging middleware
app.use(function (req, res, next) {
    console.log("[".concat(new Date().toISOString(), "] ").concat(req.method, " ").concat(req.path));
    next();
});
// ==================== ROUTES ====================
/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', function (req, res) {
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
app.post('/api/check-eligibility', function (req, res) {
    try {
        var userProfile = req.body;
        // Validate required fields
        if (!userProfile || typeof userProfile !== 'object') {
            res.status(400).json({
                error: 'Invalid request body. Expected a user profile object.',
            });
            return;
        }
        // Get the dataset path
        var datasetPath = path_1.default.join(__dirname, 'schemes_dataset.json');
        // Run eligibility check
        var results = (0, eligibilityChecker_1.checkEligibility)(userProfile, datasetPath);
        // Separate eligible and ineligible schemes (>= 60% confidence are considered eligible enough to show)
        var eligibleSchemes = results.filter(function (r) { return r.eligible || r.confidence >= 0.60; });
        var ineligibleSchemes = results.filter(function (r) { return !r.eligible && r.confidence < 0.60; });
        // Sort by confidence score (highest first)
        eligibleSchemes.sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });
        ineligibleSchemes.sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });
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
    }
    catch (error) {
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
app.post('/api/check-single-scheme', function (req, res) {
    try {
        var _a = req.body, userProfile = _a.userProfile, schemeId_1 = _a.schemeId;
        if (!userProfile || !schemeId_1) {
            res.status(400).json({
                error: 'Missing required fields: userProfile and schemeId',
            });
            return;
        }
        var datasetPath = path_1.default.join(__dirname, 'schemes_dataset.json');
        var results = (0, eligibilityChecker_1.checkEligibility)(userProfile, datasetPath);
        var schemeResult = results.find(function (r) { return r.id === schemeId_1; });
        if (!schemeResult) {
            res.status(404).json({
                error: "Scheme with ID '".concat(schemeId_1, "' not found"),
            });
            return;
        }
        res.json({
            success: true,
            result: schemeResult,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
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
app.get('/api/schemes', function (req, res) {
    try {
        var datasetPath = path_1.default.join(__dirname, 'schemes_dataset.json');
        var fs = require('fs');
        var fileContent = fs.readFileSync(datasetPath, 'utf-8');
        var schemes = JSON.parse(fileContent);
        var schemesList = schemes.map(function (scheme) { return ({
            id: scheme.id,
            title: scheme.title,
            government: scheme.government,
            category: scheme.category,
            description: scheme.description,
            status: scheme.status || 'active',
        }); });
        res.json({
            success: true,
            total_schemes: schemesList.length,
            schemes: schemesList,
        });
    }
    catch (error) {
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
app.post('/api/batch-check', function (req, res) {
    try {
        var users = req.body.users;
        if (!Array.isArray(users) || users.length === 0) {
            res.status(400).json({
                error: 'Invalid request. Expected array of user profiles.',
            });
            return;
        }
        var datasetPath_1 = path_1.default.join(__dirname, 'schemes_dataset.json');
        var batchResults = users.map(function (user, index) { return ({
            user_index: index,
            results: (0, eligibilityChecker_1.checkEligibility)(user, datasetPath_1),
        }); });
        res.json({
            success: true,
            total_users: users.length,
            batch_results: batchResults,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
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
app.post('/api/check-fake-scheme', function (req, res) {
    try {
        var text = req.body.text;
        if (!text || typeof text !== 'string') {
            res.status(400).json({ error: 'Valid text is required' });
            return;
        }
        var scriptPath = path_1.default.join(__dirname, 'ml_pipeline', 'predict.py');
        var execFile = require('child_process').execFile;
        // Call the Python script with the text as an argument
        execFile('python', [scriptPath, text], { encoding: 'utf8' }, function (error, stdout, stderr) {
            if (error) {
                console.error('Python execution error:', error.message);
                console.error('Python stderr:', stderr);
                return res.status(500).json({ error: 'Failed to evaluate text', details: stderr });
            }
            try {
                var result = JSON.parse(stdout);
                // If predict.py throws a handled error internally
                if (result.error) {
                    return res.status(500).json({ error: result.error });
                }
                res.json(__assign(__assign({ success: true }, result), { timestamp: new Date().toISOString() }));
            }
            catch (parseError) {
                console.error('Failed to parse Python output:', stdout);
                res.status(500).json({ error: 'Invalid response from ML model' });
            }
        });
    }
    catch (error) {
        console.error('Error in check-fake-scheme:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ==================== ERROR HANDLING ====================
// 404 handler
app.use(function (req, res) {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
    });
});
// Global error handler
app.use(function (err, req, res, next) {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message,
    });
});
// ==================== SERVER STARTUP ====================
app.listen(PORT, function () {
    console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551       PrajaVaani Eligibility Checker API Server       \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n\nServer running at: http://localhost:".concat(PORT, "\nEnvironment: ").concat(process.env.NODE_ENV || 'development', "\n\nAvailable endpoints:\n  GET  /api/health                    - Health check\n  GET  /api/schemes                   - List all schemes\n  POST /api/check-eligibility         - Check all schemes for user\n  POST /api/check-single-scheme       - Check single scheme\n  POST /api/batch-check               - Check multiple users\n\nDocumentation:\n  See expressServer.ts for detailed endpoint specifications\n"));
});
exports.default = app;
