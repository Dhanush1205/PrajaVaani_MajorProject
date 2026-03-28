/**
 * React Component Example: PrajaVaani Eligibility Checker
 * 
 * This demonstrates how to integrate the eligibility checker module
 * into a React or Next.js frontend application.
 */

import React, { useState, useCallback } from 'react';

// ==================== TYPE DEFINITIONS ====================

interface UserProfile {
  age?: number;
  gender?: string;
  state?: string;
  caste?: string;
  annual_income?: number;
  is_farmer?: boolean;
  is_tenant_farmer?: boolean;
  is_land_owner?: boolean;
  units_consumed?: number;
  ration_card?: string;
  is_student?: boolean;
  is_unemployed?: boolean;
  occupation?: string;
  is_bpl?: boolean;
  district?: string;
  already_has_lpg?: boolean;
  is_mother?: boolean;
  [key: string]: any;
}

interface EligibilityResult {
  id: string;
  title: string;
  government: string;
  category: string;
  eligible: boolean;
  confidence: number;
  missing_criteria: string[];
  required_documents: string[];
}

// ==================== FORM COMPONENT ====================

/**
 * UserProfileForm - Collects user demographic and socioeconomic information
 */
export const UserProfileForm: React.FC<{
  onSubmit: (profile: UserProfile) => void;
  loading?: boolean;
}> = ({ onSubmit, loading = false }) => {
  const [formData, setFormData] = useState<UserProfile>({
    age: undefined,
    gender: undefined,
    state: 'Telangana',
    caste: undefined,
    annual_income: undefined,
    is_farmer: false,
    is_student: false,
    is_unemployed: false,
    is_bpl: false,
    ration_card: undefined,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value ? parseInt(value) : undefined,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value || undefined,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="user-profile-form">
      <fieldset>
        <legend>Personal Information</legend>

        <div className="form-group">
          <label htmlFor="age">Age *</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age || ''}
            onChange={handleChange}
            placeholder="e.g., 24"
            min="1"
            max="120"
          />
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select id="gender" name="gender" value={formData.gender || ''} onChange={handleChange}>
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="state">State *</label>
          <select id="state" name="state" value={formData.state || ''} onChange={handleChange}>
            <option value="Telangana">Telangana</option>
            <option value="Andhra Pradesh">Andhra Pradesh</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Other">Other State</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="caste">Caste/Category</label>
          <select id="caste" name="caste" value={formData.caste || ''} onChange={handleChange}>
            <option value="">Select...</option>
            <option value="SC">Scheduled Caste (SC)</option>
            <option value="ST">Scheduled Tribe (ST)</option>
            <option value="BC">Backward Caste (BC)</option>
            <option value="EBC">Extremely Backward Caste (EBC)</option>
            <option value="OBC">Other Backward Classes (OBC)</option>
            <option value="Minority">Minority</option>
            <option value="General">General</option>
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend>Financial Information</legend>

        <div className="form-group">
          <label htmlFor="annual_income">Annual Income (₹)</label>
          <input
            type="number"
            id="annual_income"
            name="annual_income"
            value={formData.annual_income || ''}
            onChange={handleChange}
            placeholder="e.g., 180000"
            min="0"
            step="10000"
          />
        </div>

        <div className="form-group">
          <label htmlFor="is_bpl">
            <input
              type="checkbox"
              id="is_bpl"
              name="is_bpl"
              checked={formData.is_bpl || false}
              onChange={handleChange}
            />
            BPL (Below Poverty Line)
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="ration_card">Ration Card Type</label>
          <select id="ration_card" name="ration_card" value={formData.ration_card || ''} onChange={handleChange}>
            <option value="">No Ration Card</option>
            <option value="White">White (APL)</option>
            <option value="Yellow">Yellow (BPL)</option>
            <option value="Red">Red (AAY)</option>
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend>Occupation & Status</legend>

        <div className="form-group">
          <label htmlFor="is_farmer">
            <input
              type="checkbox"
              id="is_farmer"
              name="is_farmer"
              checked={formData.is_farmer || false}
              onChange={handleChange}
            />
            Farmer / Land Owner
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="is_student">
            <input
              type="checkbox"
              id="is_student"
              name="is_student"
              checked={formData.is_student || false}
              onChange={handleChange}
            />
            Student
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="is_unemployed">
            <input
              type="checkbox"
              id="is_unemployed"
              name="is_unemployed"
              checked={formData.is_unemployed || false}
              onChange={handleChange}
            />
            Currently Unemployed
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="is_mother">
            <input
              type="checkbox"
              id="is_mother"
              name="is_mother"
              checked={formData.is_mother || false}
              onChange={handleChange}
            />
            Mother
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="units_consumed">Electricity Units Consumed (Monthly)</label>
          <input
            type="number"
            id="units_consumed"
            name="units_consumed"
            value={formData.units_consumed || ''}
            onChange={handleChange}
            placeholder="e.g., 120"
            min="0"
            step="10"
          />
        </div>
      </fieldset>

      <button type="submit" disabled={loading}>
        {loading ? 'Checking Eligibility...' : 'Check Eligibility'}
      </button>
    </form>
  );
};

// ==================== RESULTS COMPONENT ====================

/**
 * EligibilityResults - Displays scheme eligibility results
 */
export const EligibilityResults: React.FC<{
  results: EligibilityResult[];
  userProfile?: UserProfile;
}> = ({ results, userProfile }) => {
  const [activeScheme, setActiveScheme] = useState<string | null>(null);

  if (!results || results.length === 0) {
    return (
      <div className="results-container">
        <p>No results yet. Fill in the form above and click "Check Eligibility".</p>
      </div>
    );
  }

  const eligible = results.filter(r => r.eligible);
  const ineligible = results.filter(r => !r.eligible);

  return (
    <div className="results-container">
      <div className="results-summary">
        <h2>Eligibility Check Results</h2>
        <div className="summary-stats">
          <div className="stat">
            <div className="stat-value">{results.length}</div>
            <div className="stat-label">Total Schemes</div>
          </div>
          <div className="stat eligible">
            <div className="stat-value">{eligible.length}</div>
            <div className="stat-label">Eligible</div>
          </div>
          <div className="stat ineligible">
            <div className="stat-value">{ineligible.length}</div>
            <div className="stat-label">Ineligible</div>
          </div>
        </div>
      </div>

      {eligible.length > 0 && (
        <div className="schemes-section">
          <h3>✓ Eligible Schemes ({eligible.length})</h3>

          <div className="scheme-list">
            {eligible
              .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
              .map(scheme => (
                <div
                  key={scheme.id}
                  className="scheme-card eligible"
                  onClick={() => setActiveScheme(activeScheme === scheme.id ? null : scheme.id)}
                >
                  <div className="scheme-header">
                    <div className="scheme-title-section">
                      <h4>{scheme.title}</h4>
                      <span className="scheme-government">{scheme.government}</span>
                    </div>
                    <div className="scheme-confidence">
                      <div className="confidence-score">
                        {(scheme.confidence * 100).toFixed(0)}%
                      </div>
                      <p>Match</p>
                    </div>
                  </div>

                  <div className="scheme-category">{scheme.category}</div>

                  {activeScheme === scheme.id && (
                    <div className="scheme-details">
                      <div className="detail-section">
                        <h5>Required Documents ({scheme.required_documents.length})</h5>
                        <ul>
                          {scheme.required_documents.map((doc, idx) => (
                            <li key={idx}>{doc}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {ineligible.length > 0 && (
        <div className="schemes-section">
          <h3>✗ Ineligible Schemes ({ineligible.length})</h3>

          <div className="scheme-list">
            {ineligible.slice(0, 5).map(scheme => (
              <div key={scheme.id} className="scheme-card ineligible">
                <div className="scheme-header">
                  <div className="scheme-title-section">
                    <h4>{scheme.title}</h4>
                    <span className="scheme-government">{scheme.government}</span>
                  </div>
                </div>

                <div className="scheme-category">{scheme.category}</div>

                {scheme.missing_criteria.length > 0 && (
                  <div className="missing-criteria">
                    <small>Requirement not met: {scheme.missing_criteria[0]}</small>
                  </div>
                )}
              </div>
            ))}
          </div>

          {ineligible.length > 5 && (
            <p className="show-more">... and {ineligible.length - 5} more ineligible schemes</p>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== MAIN APP COMPONENT ====================

/**
 * EligibilityChecker - Main application component
 */
export const EligibilityChecker: React.FC = () => {
  const [results, setResults] = useState<EligibilityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const handleFormSubmit = useCallback(async (profile: UserProfile) => {
    setLoading(true);
    setError(null);

    try {
      // Call backend API
      const response = await fetch('/api/check-eligibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Combine eligible and ineligible results
        const allResults = [
          ...(data.results?.eligible || []),
          ...(data.results?.ineligible || []),
        ];
        setResults(allResults);
        setUserProfile(profile);
      } else {
        setError(data.error || 'Failed to check eligibility');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="eligibility-checker-app">
      <header className="app-header">
        <h1>PrajaVaani Eligibility Checker</h1>
        <p>Find government schemes you're eligible for</p>
      </header>

      <main className="app-main">
        <div className="form-section">
          <UserProfileForm onSubmit={handleFormSubmit} loading={loading} />
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="results-section">
          <EligibilityResults results={results} userProfile={userProfile} />
        </div>
      </main>

      <style jsx>{`
        .eligibility-checker-app {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, sans-serif;
        }

        .app-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 20px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
        }

        .app-header h1 {
          margin: 0 0 10px 0;
          font-size: 32px;
        }

        .app-header p {
          margin: 0;
          font-size: 16px;
          opacity: 0.9;
        }

        .app-main {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 40px;
        }

        .form-section {
          order: 1;
        }

        .results-section {
          order: 2;
        }

        .user-profile-form {
          background: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 20px;
        }

        fieldset {
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
          padding: 15px;
          border-radius: 4px;
        }

        legend {
          font-weight: 600;
          padding: 0 10px;
          color: #333;
        }

        .form-group {
          margin-bottom: 15px;
        }

        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #555;
          font-size: 14px;
        }

        input[type='number'],
        input[type='text'],
        select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        input[type='number']:focus,
        input[type='text']:focus,
        select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        input[type='checkbox'] {
          margin-right: 8px;
        }

        button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          background: #fff3cd;
          border: 1px solid #ffc107;
          color: #856404;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .results-container {
          background: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .results-summary {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f0f0f0;
        }

        .results-summary h2 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .summary-stats {
          display: flex;
          gap: 20px;
          justify-content: space-around;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #667eea;
        }

        .stat-label {
          font-size: 12px;
          color: #999;
          margin-top: 5px;
          text-transform: uppercase;
        }

        .stat.eligible .stat-value {
          color: #28a745;
        }

        .stat.ineligible .stat-value {
          color: #dc3545;
        }

        .schemes-section {
          margin-bottom: 30px;
        }

        .schemes-section h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 18px;
        }

        .scheme-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .scheme-card {
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scheme-card.eligible {
          border-left: 4px solid #28a745;
          background: #f8fdf9;
        }

        .scheme-card.eligible:hover {
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.15);
        }

        .scheme-card.ineligible {
          border-left: 4px solid #dc3545;
          background: #fdf8f8;
          opacity: 0.8;
        }

        .scheme-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .scheme-title-section h4 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 16px;
        }

        .scheme-government {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
        }

        .scheme-confidence {
          text-align: center;
        }

        .confidence-score {
          font-size: 20px;
          font-weight: bold;
          color: #28a745;
        }

        .scheme-confidence p {
          margin: 0;
          font-size: 11px;
          color: #999;
        }

        .scheme-category {
          font-size: 13px;
          color: #668;
          margin-bottom: 10px;
        }

        .scheme-details {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e0e0e0;
        }

        .detail-section h5 {
          margin: 0 0 10px 0;
          font-size: 13px;
          color: #667eea;
          text-transform: uppercase;
        }

        .detail-section ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #666;
        }

        .detail-section li {
          margin-bottom: 5px;
        }

        .missing-criteria {
          font-size: 12px;
          color: #dc3545;
          margin-top: 8px;
        }

        .show-more {
          text-align: center;
          color: #999;
          font-size: 13px;
          margin-top: 10px;
        }

        @media (max-width: 768px) {
          .app-main {
            grid-template-columns: 1fr;
          }

          .user-profile-form {
            position: static;
          }

          .summary-stats {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default EligibilityChecker;
