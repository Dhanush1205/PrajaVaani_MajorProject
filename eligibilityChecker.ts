import * as fs from 'fs';
import * as path from 'path';

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
  is_weaver?: boolean;
  is_shg_member?: boolean;
  is_artisan?: boolean;
  is_fisherman?: boolean;
  is_unorganized_worker?: boolean;
  is_taxpayer?: boolean;
  is_govt_employee?: boolean;
  is_in_targeted_district?: boolean;
  is_not_full_time_employed?: boolean;
  max_land_size_acres?: number;
  own_house?: boolean;
  suitable_rooftop?: boolean;
  senior_citizen_above_70?: boolean;
  is_institutional_holder?: boolean;
  min_attendance_percent?: number;
  income_status?: string;
  homeless?: boolean;
  [key: string]: any;
}

interface SchemeCriteria {
  [key: string]: any;
}

interface Scheme {
  id: string;
  title: string;
  government: string;
  category: string;
  description: string;
  benefits: string;
  status?: string;
  criteria: SchemeCriteria;
  documents: string[];
  confidence_weight: { [key: string]: number };
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

interface CriteriaCheckResult {
  valid: boolean;
  reason?: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user meets age criteria
 */
function checkAge(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  const userAge = user.age;

  // If no age criteria needed, pass
  if (criteria.min_age === undefined && criteria.max_age === undefined) {
    return { valid: true };
  }

  // If user age is not provided
  if (userAge === undefined) {
    return { valid: false, reason: 'Age not provided' };
  }

  // Check minimum age
  if (criteria.min_age !== undefined && userAge < criteria.min_age) {
    return {
      valid: false,
      reason: `Age must be at least ${criteria.min_age}`,
    };
  }

  // Check maximum age
  if (criteria.max_age !== undefined && userAge > criteria.max_age) {
    return {
      valid: false,
      reason: `Age must not exceed ${criteria.max_age}`,
    };
  }

  return { valid: true };
}

/**
 * Check if user meets gender criteria
 */
function checkGender(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (criteria.gender === undefined) {
    return { valid: true };
  }

  if (!user.gender) {
    return { valid: false, reason: 'Gender not provided' };
  }

  if (user.gender.toLowerCase() !== criteria.gender.toLowerCase()) {
    return {
      valid: false,
      reason: `Must be ${criteria.gender}`,
    };
  }

  return { valid: true };
}

/**
 * Check if user meets income criteria (handles both rural and urban)
 */
function checkIncome(
  user: UserProfile,
  criteria: SchemeCriteria,
  ruralOrUrban?: string
): CriteriaCheckResult {
  const income = user.annual_income;

  // If no income limit, pass
  if (
    criteria.max_income === undefined &&
    criteria.max_income_rural === undefined &&
    criteria.max_income_urban === undefined &&
    criteria.income_limits === undefined
  ) {
    return { valid: true };
  }

  // If income not provided, return false
  if (income === undefined) {
    return { valid: false, reason: 'Annual income not provided' };
  }

  // Check simple max_income
  if (criteria.max_income !== undefined && income > criteria.max_income) {
    return {
      valid: false,
      reason: `Income must not exceed ₹${criteria.max_income}`,
    };
  }

  // Check rural/urban specific limits
  if (criteria.max_income_rural !== undefined) {
    if (ruralOrUrban === 'rural' && income > criteria.max_income_rural) {
      return {
        valid: false,
        reason: `Rural income must not exceed ₹${criteria.max_income_rural}`,
      };
    }
  }

  if (criteria.max_income_urban !== undefined) {
    if (ruralOrUrban === 'urban' && income > criteria.max_income_urban) {
      return {
        valid: false,
        reason: `Urban income must not exceed ₹${criteria.max_income_urban}`,
      };
    }
  }

  // Check nested income_limits (with caste/disability variations)
  if (criteria.income_limits && typeof criteria.income_limits === 'object') {
    const caste = user.caste?.toLowerCase() || '';

    // Determine which limit applies
    let applicableLimit = null;

    if (caste.includes('sc') || caste.includes('st')) {
      applicableLimit = criteria.income_limits.sc_st;
    } else if (caste.includes('bc') || caste.includes('ebc') || caste.includes('minority')) {
      if (ruralOrUrban === 'rural') {
        applicableLimit = criteria.income_limits.bc_ebc_minority_rural;
      } else if (ruralOrUrban === 'urban') {
        applicableLimit = criteria.income_limits.bc_ebc_minority_urban;
      } else {
        // If not specified, use rural as default
        applicableLimit = criteria.income_limits.bc_ebc_minority_rural;
      }
    }

    // Default to general limit if available
    if (!applicableLimit && criteria.income_limits.general) {
      applicableLimit = criteria.income_limits.general;
    }

    if (applicableLimit && income > applicableLimit) {
      return {
        valid: false,
        reason: `Income must not exceed ₹${applicableLimit}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Check if user belongs to required categories
 */
function checkCategory(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (!criteria.categories || !Array.isArray(criteria.categories)) {
    return { valid: true };
  }

  if (!user.caste) {
    return { valid: false, reason: 'Caste/Category not provided' };
  }

  const userCaste = user.caste.toUpperCase();
  const validCategories = criteria.categories.map((c: string) => c.toUpperCase());

  // Check for exact match or substring match
  const isValid = validCategories.some(
    (cat: string) =>
      userCaste === cat ||
      userCaste.includes(cat) ||
      cat.includes(userCaste)
  );

  if (!isValid) {
    return {
      valid: false,
      reason: `Must belong to one of: ${criteria.categories.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Check boolean flags (is_farmer, is_student, etc.)
 */
function checkBooleanFlags(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  const skipFlags = ['bpl_required', 'ration_card_required'];

  // Dynamically check any boolean in criteria
  for (const [flag, requirement] of Object.entries(criteria)) {
    if (typeof requirement === 'boolean' && !skipFlags.includes(flag)) {

      // Auto-map some custom compound flags
      let userValue = user[flag];
      if (flag === 'is_farmer_or_shg_member') userValue = !!(user.is_farmer || user.is_shg_member);
      if (flag === 'shg_member') userValue = user.is_shg_member;
      if (flag === 'land_owner') userValue = user.is_land_owner;
      if (flag === 'is_unemployed_or_dropout') userValue = !!(user.is_unemployed || user.is_student);
      if (flag === 'bpl_required_if_under_70') userValue = !!(user.is_bpl || user.senior_citizen_above_70);
      if (flag === 'bpl_status') userValue = user.is_bpl;
      if (flag === 'has_ration_card' || flag === 'has_pds_ration_card') userValue = !!user.ration_card;
      if (flag === 'is_indian_citizen' || flag === 'resides_in_india') userValue = true; // Implicit
      if (flag === 'is_entrepreneur' || flag === 'business_owner') userValue = user.occupation === 'Business' || user.occupation === 'Self-Employed';
      if (flag === 'is_unemployed_youth' || flag === 'job_seeker') userValue = user.is_unemployed;
      if (flag === 'owns_agricultural_land') userValue = user.is_land_owner;
      if (flag === 'has_bank_account') userValue = true; // Assume standard
      if (flag === 'is_rural_poor_woman') userValue = !!(user.is_bpl && user.gender === 'Female' && user.state && user.state.includes('Rural'));
      if (flag === 'is_urban_poor') userValue = !!(user.is_bpl && user.state && user.state.includes('Urban'));
      if (flag === 'rural_household') userValue = !!(user.state && user.state.includes('Rural'));

      if (requirement === true) {
        if (userValue !== true) {
          return {
            valid: false,
            reason: `Requirement: ${flag.replace(/_/g, ' ')}`,
          };
        }
      } else if (requirement === false) {
        if (userValue === true) {
          return {
            valid: false,
            reason: `Must not be ${flag.replace(/_/g, ' ')}`,
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Check state residency
 */
function checkStateResident(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (criteria.state_resident === undefined) {
    return { valid: true };
  }

  if (!user.state) {
    return { valid: false, reason: 'State not provided' };
  }

  if (user.state.toLowerCase() !== criteria.state_resident.toLowerCase()) {
    return {
      valid: false,
      reason: `Must be a resident of ${criteria.state_resident}`,
    };
  }

  return { valid: true };
}

/**
 * Check ration card requirements
 */
function checkRationCard(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (criteria.ration_card_required === undefined) {
    return { valid: true };
  }

  if (!user.ration_card) {
    return { valid: false, reason: 'Ration card not provided' };
  }

  // If it's a string, check for specific ration card type
  if (typeof criteria.ration_card_required === 'string') {
    if (user.ration_card.toLowerCase() !== criteria.ration_card_required.toLowerCase()) {
      return {
        valid: false,
        reason: `Must have ${criteria.ration_card_required} ration card`,
      };
    }
  } else if (criteria.ration_card_required === true) {
    // Any ration card is acceptable
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Check BPL status requirement
 */
function checkBPLStatus(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (criteria.bpl_required === undefined) {
    return { valid: true };
  }

  if (criteria.bpl_required === true) {
    if (user.is_bpl !== true) {
      return { valid: false, reason: 'Must have BPL (Below Poverty Line) status' };
    }
  }

  return { valid: true };
}

/**
 * Check occupation requirement
 */
function checkOccupation(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (criteria.occupation === undefined) {
    return { valid: true };
  }

  if (!user.occupation) {
    return { valid: false, reason: 'Occupation not provided' };
  }

  if (user.occupation.toLowerCase() !== criteria.occupation.toLowerCase()) {
    return {
      valid: false,
      reason: `Occupation must be: ${criteria.occupation}`,
    };
  }

  return { valid: true };
}

/**
 * Check units consumed (electricity, energy)
 */
function checkUnitsConsumed(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (criteria.max_units_consumed === undefined) {
    return { valid: true };
  }

  if (user.units_consumed === undefined) {
    return { valid: false, reason: 'Units consumed not provided' };
  }

  if (user.units_consumed > criteria.max_units_consumed) {
    return {
      valid: false,
      reason: `Consumption must not exceed ${criteria.max_units_consumed} units`,
    };
  }

  return { valid: true };
}

/**
 * Check land ownership limits
 */
function checkLandSize(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (criteria.max_land_size_acres === undefined) {
    return { valid: true };
  }

  if (user.max_land_size_acres === undefined) {
    return { valid: false, reason: 'Land size not provided' };
  }

  if (user.max_land_size_acres > criteria.max_land_size_acres) {
    return {
      valid: false,
      reason: `Land must not exceed ${criteria.max_land_size_acres} acres`,
    };
  }

  return { valid: true };
}

/**
 * Check attendance percentage requirement
 */
function checkAttendance(user: UserProfile, criteria: SchemeCriteria): CriteriaCheckResult {
  if (criteria.min_attendance_percent === undefined) {
    return { valid: true };
  }

  if (user.min_attendance_percent === undefined) {
    return { valid: false, reason: 'Attendance percentage not provided' };
  }

  if (user.min_attendance_percent < criteria.min_attendance_percent) {
    return {
      valid: false,
      reason: `Attendance must be at least ${criteria.min_attendance_percent}%`,
    };
  }

  return { valid: true };
}

/**
 * Validate all criteria for a scheme
 */
function validateCriteria(user: UserProfile, schemeCriteria: SchemeCriteria): CriteriaCheckResult {
  // Check all criteria in sequence
  const checks = [
    checkAge(user, schemeCriteria),
    checkGender(user, schemeCriteria),
    checkStateResident(user, schemeCriteria),
    checkCategory(user, schemeCriteria),
    checkIncome(user, schemeCriteria, user.state?.toLowerCase().includes('rural') ? 'rural' : 'urban'),
    checkBooleanFlags(user, schemeCriteria),
    checkRationCard(user, schemeCriteria),
    checkBPLStatus(user, schemeCriteria),
    checkOccupation(user, schemeCriteria),
    checkUnitsConsumed(user, schemeCriteria),
    checkLandSize(user, schemeCriteria),
    checkAttendance(user, schemeCriteria),
  ];

  // Return first failed check
  for (const check of checks) {
    if (!check.valid) {
      return check;
    }
  }

  return { valid: true };
}

/**
 * Calculate confidence score for a user-scheme match
 */
function calculateConfidence(user: UserProfile, scheme: Scheme): number {
  const weights = scheme.confidence_weight || {};
  let totalScore = 0;
  let totalWeight = 0;

  for (const [weightKey, weight] of Object.entries(weights)) {
    if (typeof weight !== 'number') continue;

    totalWeight += weight;
    let keyScores = 0;

    const criteria = scheme.criteria;

    // Map weight keys to criteria checks with partial scoring
    if (weightKey === 'income' && (criteria.max_income !== undefined ||
      criteria.max_income_rural !== undefined ||
      criteria.max_income_urban !== undefined ||
      criteria.income_limits !== undefined)) {
      const incomeCheck = checkIncome(user, criteria);
      if (incomeCheck.valid) {
        keyScores = 1.0; // Full score if valid
      } else if (user.annual_income !== undefined) {
        // Partial score based on how close they are to the limit
        const maxIncome = criteria.max_income || criteria.max_income_rural || criteria.max_income_urban || 300000;
        const proximityRatio = 1 - Math.min(1, (user.annual_income - maxIncome) / maxIncome);
        keyScores = Math.max(0, proximityRatio * 0.4); // Up to 40% for being close
      }
    } else if (weightKey === 'age' && (criteria.min_age !== undefined || criteria.max_age !== undefined)) {
      const ageCheck = checkAge(user, criteria);
      if (ageCheck.valid) {
        keyScores = 1.0;
      } else if (user.age !== undefined) {
        // Partial score based on how close to acceptable age range
        const minAge = criteria.min_age || 18;
        const maxAge = criteria.max_age || 65;
        const range = maxAge - minAge;
        const closestBound = Math.min(Math.abs(user.age - minAge), Math.abs(user.age - maxAge));
        const proximityRatio = 1 - Math.min(1, closestBound / (range || 20));
        keyScores = Math.max(0, proximityRatio * 0.3); // Up to 30% for being close
      }
    } else if (weightKey === 'caste' && criteria.categories) {
      const categoryCheck = checkCategory(user, criteria);
      keyScores = categoryCheck.valid ? 1.0 : 0;
    } else if (weightKey === 'ration_card' && criteria.ration_card_required) {
      const rationCheck = checkRationCard(user, criteria);
      keyScores = rationCheck.valid ? 1.0 : 0;
    } else if (weightKey === 'bpl_status' && criteria.bpl_required) {
      const bplCheck = checkBPLStatus(user, criteria);
      keyScores = bplCheck.valid ? 1.0 : 0;
    } else if (weightKey === 'occupation' && criteria.occupation) {
      const occupationCheck = checkOccupation(user, criteria);
      keyScores = occupationCheck.valid ? 1.0 : 0;
    } else if (weightKey === 'status' && criteria.is_unemployed) {
      keyScores = user.is_unemployed === true ? 1.0 : 0;
    } else if (weightKey === 'land_ownership' && criteria.land_owner) {
      keyScores = user.is_land_owner === true ? 1.0 : 0;
    } else if (weightKey === 'housing_status' && criteria.homeless) {
      keyScores = user.homeless === true ? 1.0 : 0;
    } else if (weightKey === 'consumption' && criteria.max_units_consumed) {
      const consumptionCheck = checkUnitsConsumed(user, criteria);
      keyScores = consumptionCheck.valid ? 1.0 : 0;
    } else if (weightKey === 'shg_membership' && criteria.is_shg_member) {
      keyScores = user.is_shg_member === true ? 1.0 : 0;
    } else if (weightKey === 'attendance' && criteria.min_attendance_percent) {
      const attendanceCheck = checkAttendance(user, criteria);
      if (attendanceCheck.valid) {
        keyScores = 1.0;
      } else if (user.min_attendance_percent !== undefined) {
        // Partial score based on attendance percentage
        const minReq = criteria.min_attendance_percent || 75;
        const diff = minReq - user.min_attendance_percent;
        const proximityRatio = Math.max(0, 1 - (diff / minReq));
        keyScores = proximityRatio * 0.5; // Up to 50% for being close to attendance
      }
    } else if (weightKey === 'trade' && criteria.is_artisan) {
      keyScores = user.is_artisan === true ? 1.0 : 0;
    } else if (weightKey === 'rooftop_availability' && criteria.suitable_rooftop) {
      keyScores = user.suitable_rooftop === true ? 1.0 : 0;
    } else if (weightKey === 'location' && criteria.is_in_targeted_district) {
      keyScores = user.is_in_targeted_district === true ? 1.0 : 0;
    } else if (weightKey === 'taxpayer_status' && criteria.is_taxpayer !== undefined) {
      keyScores = user.is_taxpayer === criteria.is_taxpayer ? 1.0 : 0;
    } else if (weightKey === 'residence' && criteria.state_resident) {
      const stateCheck = checkStateResident(user, criteria);
      keyScores = stateCheck.valid ? 1.0 : 0;
    }

    totalScore += keyScores * weight;
  }

  // Return normalized confidence (0 to 1)
  if (totalWeight === 0) return 0;
  const confidence = totalScore / totalWeight;
  return Math.min(1, Math.round(confidence * 100) / 100); // Cap at 1.0, round to 2 decimals
}

/**
 * Evaluate eligibility for a single scheme
 */
function evaluateScheme(user: UserProfile, scheme: Scheme): EligibilityResult {
  // Check if scheme is discontinued
  if (scheme.status === 'discontinued') {
    return {
      id: scheme.id,
      title: scheme.title,
      government: scheme.government,
      category: scheme.category,
      eligible: false,
      confidence: 0,
      missing_criteria: ['Scheme is discontinued'],
      required_documents: [],
    };
  }

  const validationResult = validateCriteria(user, scheme.criteria);
  const eligible = validationResult.valid;

  // Calculate confidence regardless of eligibility (for partial matches)
  let confidence = calculateConfidence(user, scheme);

  // 100% Foolproof Penalties: Any fundamental parameter contradiction zeros the match entirely
  let hasStrictContradiction = false;
  const allChecks = [
    checkAge(user, scheme.criteria),
    checkGender(user, scheme.criteria),
    checkStateResident(user, scheme.criteria),
    checkCategory(user, scheme.criteria),
    checkIncome(user, scheme.criteria, user.state?.toLowerCase().includes('rural') ? 'rural' : 'urban'),
    checkBooleanFlags(user, scheme.criteria),
    checkRationCard(user, scheme.criteria),
    checkBPLStatus(user, scheme.criteria),
    checkOccupation(user, scheme.criteria),
    checkUnitsConsumed(user, scheme.criteria),
    checkLandSize(user, scheme.criteria),
    checkAttendance(user, scheme.criteria),
  ];

  for (const check of allChecks) {
    if (!check.valid && check.reason && !check.reason.includes('not provided')) {
      hasStrictContradiction = true;
      break;
    }
  }

  if (hasStrictContradiction) {
    confidence = 0;
  }

  // If the user fully meets all rigid criteria, they are a 100% match.
  if (eligible) {
    confidence = 1.0;
  }

  return {
    id: scheme.id,
    title: scheme.title,
    government: scheme.government,
    category: scheme.category,
    eligible,
    confidence,
    missing_criteria: eligible ? [] : (validationResult.reason ? [validationResult.reason] : []),
    required_documents: eligible ? scheme.documents : [],
  };
}

// ==================== MAIN FUNCTIONS ====================

/**
 * Load schemes from JSON dataset
 */
function loadSchemes(dataPath?: string): Scheme[] {
  try {
    // Use provided path or default to schemes_dataset.json in same directory
    const filePath = dataPath || path.join(__dirname, 'schemes_dataset.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const schemes: Scheme[] = JSON.parse(fileContent);
    return schemes;
  } catch (error) {
    console.error('Error loading schemes:', error);
    return [];
  }
}

/**
 * Main function: Check eligibility for all schemes
 */
function checkEligibility(userProfile: UserProfile, dataPath?: string): EligibilityResult[] {
  const schemes = loadSchemes(dataPath);

  if (schemes.length === 0) {
    console.warn('No schemes loaded');
    return [];
  }

  const results: EligibilityResult[] = [];

  for (const scheme of schemes) {
    const result = evaluateScheme(userProfile, scheme);
    results.push(result);
  }

  return results;
}

// ==================== EXPORTS ====================

export { loadSchemes, checkEligibility, evaluateScheme, UserProfile, EligibilityResult, Scheme };
export default { loadSchemes, checkEligibility, evaluateScheme };
