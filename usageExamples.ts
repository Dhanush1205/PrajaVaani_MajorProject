/**
 * PrajaVaani Eligibility Checker - Usage Examples
 * 
 * This file demonstrates various ways to use the eligibility checker module
 * in both Node.js and frontend environments.
 */

import { checkEligibility, evaluateScheme, UserProfile, EligibilityResult } from './eligibilityChecker';
import fs from 'fs';
import path from 'path';

// ==================== EXAMPLE 1: Basic Usage ====================

/**
 * Example 1: Check eligibility for a single user
 */
function example1_basicUsage() {
  console.log('\n=== Example 1: Basic Eligibility Check ===\n');

  // Sample user profile
  const user: UserProfile = {
    age: 24,
    gender: 'Female',
    state: 'Telangana',
    caste: 'BC',
    annual_income: 180000,
    is_farmer: false,
    is_tenant_farmer: false,
    is_land_owner: false,
    units_consumed: 120,
    ration_card: 'White',
    is_student: false,
    is_unemployed: false,
    occupation: '',
    is_bpl: false,
    district: '',
    already_has_lpg: false,
    is_mother: false,
  };

  // Check eligibility for all schemes
  const results = checkEligibility(user);

  // Display results
  console.log(`Total Schemes Checked: ${results.length}`);
  console.log(`Eligible Schemes: ${results.filter(r => r.eligible).length}`);
  console.log(`Ineligible Schemes: ${results.filter(r => !r.eligible).length}\n`);

  // Show eligible schemes with confidence scores
  const eligibleSchemes = results.filter(r => r.eligible);
  if (eligibleSchemes.length > 0) {
    console.log('ELIGIBLE SCHEMES:');
    eligibleSchemes.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.title}`);
      console.log(`   ID: ${result.id}`);
      console.log(`   Government: ${result.government}`);
      console.log(`   Category: ${result.category}`);
      console.log(`   Confidence Score: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Required Documents: ${result.required_documents.length} documents`);
    });
  }
}

// ==================== EXAMPLE 2: Filtered Results ====================

/**
 * Example 2: Get only eligible schemes from a state government
 */
function example2_filteredResults() {
  console.log('\n=== Example 2: Filter Results by Government & Category ===\n');

  const user: UserProfile = {
    age: 45,
    gender: 'Female',
    state: 'Telangana',
    caste: 'SC',
    annual_income: 120000,
    is_farmer: false,
    is_tenant_farmer: false,
    is_land_owner: false,
    units_consumed: 150,
    ration_card: 'White',
    is_student: false,
    is_unemployed: false,
    occupation: '',
    is_bpl: true,
    district: 'Hyderabad',
    already_has_lpg: false,
    is_mother: true,
  };

  const results = checkEligibility(user);

  // Filter for Telangana government schemes
  const telanganaSchemes = results.filter(
    r => r.eligible && r.government === 'Telangana'
  );

  console.log(`Telangana Schemes (Eligible): ${telanganaSchemes.length}`);
  telanganaSchemes.forEach(scheme => {
    console.log(
      `  • ${scheme.title} (${scheme.category}) - Confidence: ${(scheme.confidence * 100).toFixed(0)}%`
    );
  });

  // Filter for Social Security and Welfare categories
  const welfareSchemes = results.filter(
    r => r.eligible && (r.category.includes('Welfare') || r.category.includes('Social'))
  );

  console.log(`\nWelfare & Social Security Schemes (Eligible): ${welfareSchemes.length}`);
  welfareSchemes.forEach(scheme => {
    console.log(
      `  • ${scheme.title} [${scheme.government}] - Confidence: ${(scheme.confidence * 100).toFixed(0)}%`
    );
  });
}

// ==================== EXAMPLE 3: High Confidence Matches ====================

/**
 * Example 3: Get top matching schemes sorted by confidence
 */
function example3_topMatches() {
  console.log('\n=== Example 3: Top 5 Matching Schemes ===\n');

  const farmer: UserProfile = {
    age: 35,
    gender: 'Male',
    state: 'Telangana',
    caste: 'BC',
    annual_income: 145000,
    is_farmer: true,
    is_tenant_farmer: false,
    is_land_owner: true,
    units_consumed: 250,
    ration_card: 'White',
    is_student: false,
    is_unemployed: false,
    occupation: 'Farmer',
    is_bpl: true,
    district: 'Karimnagar',
    already_has_lpg: false,
    is_mother: false,
    max_land_size_acres: 2,
  };

  const results = checkEligibility(farmer);

  // Get eligible schemes sorted by confidence
  const topSchemes = results
    .filter(r => r.eligible)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 5);

  console.log('Top 5 Schemes for this Farmer:\n');
  topSchemes.forEach((scheme, index) => {
    console.log(`${index + 1}. ${scheme.title}`);
    console.log(`   Confidence: ${(scheme.confidence * 100).toFixed(1)}%`);
    console.log(`   Category: ${scheme.category}`);
    console.log(`   Government: ${scheme.government}`);
  });
}

// ==================== EXAMPLE 4: Detailed Analysis ====================

/**
 * Example 4: Detailed eligibility analysis with missing criteria
 */
function example4_detailedAnalysis() {
  console.log('\n=== Example 4: Detailed Eligibility Analysis ===\n');

  const student: UserProfile = {
    age: 19,
    gender: 'Male',
    state: 'Telangana',
    caste: 'OBC',
    annual_income: 250000, // Income might be too high for some schemes
    is_farmer: false,
    is_tenant_farmer: false,
    is_land_owner: false,
    units_consumed: 100,
    ration_card: undefined, // No ration card
    is_student: true,
    is_unemployed: false,
    occupation: 'Student',
    is_bpl: false,
    district: 'Hyderabad',
    already_has_lpg: true,
    is_mother: false,
  };

  const results = checkEligibility(student);

  // Show detailed analysis
  console.log('=== ELIGIBLE SCHEMES ===\n');
  const eligible = results.filter(r => r.eligible);
  if (eligible.length === 0) {
    console.log('No eligible schemes found.\n');
  } else {
    eligible.forEach(scheme => {
      console.log(`✓ ${scheme.title}`);
      console.log(`  Confidence: ${(scheme.confidence * 100).toFixed(1)}%`);
      console.log(`  Documents Needed: ${scheme.required_documents.join(', ')}`);
    });
  }

  console.log('\n=== INELIGIBLE SCHEMES (Sample) ===\n');
  const ineligible = results.filter(r => !r.eligible).slice(0, 5);
  ineligible.forEach(scheme => {
    console.log(`✗ ${scheme.title}`);
    if (scheme.missing_criteria.length > 0) {
      console.log(`  Reason: ${scheme.missing_criteria[0]}`);
    }
  });
}

// ==================== EXAMPLE 5: Compare Multiple Users ====================

/**
 * Example 5: Compare eligibility across multiple user profiles
 */
function example5_compareUsers() {
  console.log('\n=== Example 5: Compare Eligibility Across Users ===\n');

  const users: UserProfile[] = [
    {
      age: 22,
      gender: 'Female',
      state: 'Telangana',
      caste: 'SC',
      annual_income: 100000,
      is_student: true,
      is_bpl: true,
      ration_card: 'White',
    },
    {
      age: 40,
      gender: 'Male',
      state: 'Telangana',
      caste: 'BC',
      annual_income: 180000,
      is_farmer: true,
      is_land_owner: true,
      occupation: 'Farmer',
    },
    {
      age: 65,
      gender: 'Female',
      state: 'Telangana',
      caste: 'General',
      annual_income: 50000,
      is_bpl: true,
      ration_card: 'White',
      homeless: true,
    },
  ];

  const userLabels = ['College Student (F)', 'Farmer (M)', 'Elderly Woman'];

  console.log('User Profile Comparison:\n');
  users.forEach((user, index) => {
    const results = checkEligibility(user);
    const eligibleCount = results.filter(r => r.eligible).length;
    const maxConfidence = Math.max(...results.map(r => r.confidence || 0));

    console.log(
      `${userLabels[index]}: ${eligibleCount} eligible schemes (Max Confidence: ${(maxConfidence * 100).toFixed(0)}%)`
    );
  });
}

// ==================== EXAMPLE 6: Export Results to JSON ====================

/**
 * Example 6: Export eligibility check results to JSON file
 */
function example6_exportResults() {
  console.log('\n=== Example 6: Export Results to JSON ===\n');

  const user: UserProfile = {
    age: 28,
    gender: 'Female',
    state: 'Telangana',
    caste: 'BC',
    annual_income: 160000,
    is_bpl: true,
    ration_card: 'White',
  };

  const results = checkEligibility(user);

  // Create export object
  const exportData = {
    generated_at: new Date().toISOString(),
    user_profile: user,
    summary: {
      total_schemes: results.length,
      eligible: results.filter(r => r.eligible).length,
      ineligible: results.filter(r => !r.eligible).length,
    },
    results: results,
  };

  // Save to file
  const filePath = path.join(__dirname, 'eligibility_results.json');
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

  console.log(`Results exported to: ${filePath}`);
  console.log(`File size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
}

// ==================== EXAMPLE 7: API Response Format ====================

/**
 * Example 7: Format results for API response
 */
function example7_apiResponse() {
  console.log('\n=== Example 7: API Response Format ===\n');

  const user: UserProfile = {
    age: 30,
    gender: 'Female',
    state: 'Telangana',
    caste: 'ST',
    annual_income: 140000,
    is_student: false,
    is_unemployed: true,
    is_bpl: true,
  };

  const results = checkEligibility(user);
  const eligible = results.filter(r => r.eligible);
  const ineligible = results.filter(r => !r.eligible);

  // Format as API response
  const apiResponse = {
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      total_schemes_checked: results.length,
      eligible_count: eligible.length,
      ineligible_count: ineligible.length,
      match_percentage: ((eligible.length / results.length) * 100).toFixed(1) + '%',
    },
    data: {
      eligible_schemes: eligible
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .map(scheme => ({
          id: scheme.id,
          title: scheme.title,
          government: scheme.government,
          category: scheme.category,
          confidence_score: scheme.confidence,
          required_documents: scheme.required_documents,
        })),
      ineligible_count: ineligible.length,
    },
  };

  console.log(JSON.stringify(apiResponse, null, 2));
}

// ==================== Example 8: Error Handling ====================

/**
 * Example 8: Proper error handling
 */
function example8_errorHandling() {
  console.log('\n=== Example 8: Error Handling & Edge Cases ===\n');

  // Test 1: Empty user object
  console.log('Test 1: Empty user profile');
  const emptyUser: UserProfile = {};
  const results1 = checkEligibility(emptyUser);
  console.log(
    `Result: Found ${results1.filter(r => r.eligible).length} schemes despite empty profile`
  );

  // Test 2: Minimal user info
  console.log('\nTest 2: Minimal user information');
  const minimalUser: UserProfile = {
    age: 25,
    state: 'Telangana',
  };
  const results2 = checkEligibility(minimalUser);
  console.log(
    `Result: Found ${results2.filter(r => r.eligible).length} eligible schemes with minimal data`
  );

  // Test 3: User from different state
  console.log('\nTest 3: User from non-Telangana state');
  const otherStateUser: UserProfile = {
    age: 30,
    state: 'Karnataka',
    caste: 'SC',
    annual_income: 100000,
  };
  const results3 = checkEligibility(otherStateUser);
  const telanganaSchemesEligible = results3.filter(
    r => r.eligible && r.government === 'Telangana'
  ).length;
  console.log(
    `Result: Found ${telanganaSchemesEligible} eligible Telangana schemes (expected 0-1)`
  );

  console.log('\n✓ All edge cases handled gracefully');
}

// ==================== RUN ALL EXAMPLES ====================

function runAllExamples() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  PrajaVaani Eligibility Checker - Usage Examples          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    example1_basicUsage();
    example2_filteredResults();
    example3_topMatches();
    example4_detailedAnalysis();
    example5_compareUsers();
    example6_exportResults();
    example7_apiResponse();
    example8_errorHandling();

    console.log(
      '\n╔═══════════════════════════════════════════════════════════╗'
    );
    console.log('║  All examples completed successfully!                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// ==================== EXPORTS ====================

export {
  example1_basicUsage,
  example2_filteredResults,
  example3_topMatches,
  example4_detailedAnalysis,
  example5_compareUsers,
  example6_exportResults,
  example7_apiResponse,
  example8_errorHandling,
  runAllExamples,
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
