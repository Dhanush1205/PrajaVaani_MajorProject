"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSchemes = loadSchemes;
exports.checkEligibility = checkEligibility;
exports.evaluateScheme = evaluateScheme;
var fs = require("fs");
var path = require("path");
// ==================== HELPER FUNCTIONS ====================
/**
 * Check if user meets age criteria
 */
function checkAge(user, criteria) {
    var userAge = user.age;
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
            reason: "Age must be at least ".concat(criteria.min_age),
        };
    }
    // Check maximum age
    if (criteria.max_age !== undefined && userAge > criteria.max_age) {
        return {
            valid: false,
            reason: "Age must not exceed ".concat(criteria.max_age),
        };
    }
    return { valid: true };
}
/**
 * Check if user meets gender criteria
 */
function checkGender(user, criteria) {
    if (criteria.gender === undefined) {
        return { valid: true };
    }
    if (!user.gender) {
        return { valid: false, reason: 'Gender not provided' };
    }
    if (user.gender.toLowerCase() !== criteria.gender.toLowerCase()) {
        return {
            valid: false,
            reason: "Must be ".concat(criteria.gender),
        };
    }
    return { valid: true };
}
/**
 * Check if user meets income criteria (handles both rural and urban)
 */
function checkIncome(user, criteria, ruralOrUrban) {
    var _a;
    var income = user.annual_income;
    // If no income limit, pass
    if (criteria.max_income === undefined &&
        criteria.max_income_rural === undefined &&
        criteria.max_income_urban === undefined &&
        criteria.income_limits === undefined) {
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
            reason: "Income must not exceed \u20B9".concat(criteria.max_income),
        };
    }
    // Check rural/urban specific limits
    if (criteria.max_income_rural !== undefined) {
        if (ruralOrUrban === 'rural' && income > criteria.max_income_rural) {
            return {
                valid: false,
                reason: "Rural income must not exceed \u20B9".concat(criteria.max_income_rural),
            };
        }
    }
    if (criteria.max_income_urban !== undefined) {
        if (ruralOrUrban === 'urban' && income > criteria.max_income_urban) {
            return {
                valid: false,
                reason: "Urban income must not exceed \u20B9".concat(criteria.max_income_urban),
            };
        }
    }
    // Check nested income_limits (with caste/disability variations)
    if (criteria.income_limits && typeof criteria.income_limits === 'object') {
        var caste = ((_a = user.caste) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        // Determine which limit applies
        var applicableLimit = null;
        if (caste.includes('sc') || caste.includes('st')) {
            applicableLimit = criteria.income_limits.sc_st;
        }
        else if (caste.includes('bc') || caste.includes('ebc') || caste.includes('minority')) {
            if (ruralOrUrban === 'rural') {
                applicableLimit = criteria.income_limits.bc_ebc_minority_rural;
            }
            else if (ruralOrUrban === 'urban') {
                applicableLimit = criteria.income_limits.bc_ebc_minority_urban;
            }
            else {
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
                reason: "Income must not exceed \u20B9".concat(applicableLimit),
            };
        }
    }
    return { valid: true };
}
/**
 * Check if user belongs to required categories
 */
function checkCategory(user, criteria) {
    if (!criteria.categories || !Array.isArray(criteria.categories)) {
        return { valid: true };
    }
    if (!user.caste) {
        return { valid: false, reason: 'Caste/Category not provided' };
    }
    var userCaste = user.caste.toUpperCase();
    var validCategories = criteria.categories.map(function (c) { return c.toUpperCase(); });
    // Check for exact match or substring match
    var isValid = validCategories.some(function (cat) {
        return userCaste === cat ||
            userCaste.includes(cat) ||
            cat.includes(userCaste);
    });
    if (!isValid) {
        return {
            valid: false,
            reason: "Must belong to one of: ".concat(criteria.categories.join(', ')),
        };
    }
    return { valid: true };
}
/**
 * Check boolean flags (is_farmer, is_student, etc.)
 */
function checkBooleanFlags(user, criteria) {
    var skipFlags = ['bpl_required', 'ration_card_required'];
    // Dynamically check any boolean in criteria
    for (var _i = 0, _a = Object.entries(criteria); _i < _a.length; _i++) {
        var _b = _a[_i], flag = _b[0], requirement = _b[1];
        if (typeof requirement === 'boolean' && !skipFlags.includes(flag)) {
            // Auto-map some custom compound flags
            var userValue = user[flag];
            if (flag === 'is_farmer_or_shg_member')
                userValue = !!(user.is_farmer || user.is_shg_member);
            if (flag === 'shg_member')
                userValue = user.is_shg_member;
            if (flag === 'land_owner')
                userValue = user.is_land_owner;
            if (flag === 'is_unemployed_or_dropout')
                userValue = !!(user.is_unemployed || user.is_student);
            if (flag === 'bpl_required_if_under_70')
                userValue = !!(user.is_bpl || user.senior_citizen_above_70);
            if (flag === 'bpl_status')
                userValue = user.is_bpl;
            if (flag === 'has_ration_card' || flag === 'has_pds_ration_card')
                userValue = !!user.ration_card;
            if (flag === 'is_indian_citizen' || flag === 'resides_in_india')
                userValue = true; // Implicit
            if (flag === 'is_entrepreneur' || flag === 'business_owner')
                userValue = user.occupation === 'Business' || user.occupation === 'Self-Employed';
            if (flag === 'is_unemployed_youth' || flag === 'job_seeker')
                userValue = user.is_unemployed;
            if (flag === 'owns_agricultural_land')
                userValue = user.is_land_owner;
            if (flag === 'has_bank_account')
                userValue = true; // Assume standard
            if (flag === 'is_rural_poor_woman')
                userValue = !!(user.is_bpl && user.gender === 'Female' && user.state && user.state.includes('Rural'));
            if (flag === 'is_urban_poor')
                userValue = !!(user.is_bpl && user.state && user.state.includes('Urban'));
            if (flag === 'rural_household')
                userValue = !!(user.state && user.state.includes('Rural'));
            if (requirement === true) {
                if (userValue !== true) {
                    return {
                        valid: false,
                        reason: "Requirement: ".concat(flag.replace(/_/g, ' ')),
                    };
                }
            }
            else if (requirement === false) {
                if (userValue === true) {
                    return {
                        valid: false,
                        reason: "Must not be ".concat(flag.replace(/_/g, ' ')),
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
function checkStateResident(user, criteria) {
    if (criteria.state_resident === undefined) {
        return { valid: true };
    }
    if (!user.state) {
        return { valid: false, reason: 'State not provided' };
    }
    if (user.state.toLowerCase() !== criteria.state_resident.toLowerCase()) {
        return {
            valid: false,
            reason: "Must be a resident of ".concat(criteria.state_resident),
        };
    }
    return { valid: true };
}
/**
 * Check ration card requirements
 */
function checkRationCard(user, criteria) {
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
                reason: "Must have ".concat(criteria.ration_card_required, " ration card"),
            };
        }
    }
    else if (criteria.ration_card_required === true) {
        // Any ration card is acceptable
        return { valid: true };
    }
    return { valid: true };
}
/**
 * Check BPL status requirement
 */
function checkBPLStatus(user, criteria) {
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
function checkOccupation(user, criteria) {
    if (criteria.occupation === undefined) {
        return { valid: true };
    }
    if (!user.occupation) {
        return { valid: false, reason: 'Occupation not provided' };
    }
    if (user.occupation.toLowerCase() !== criteria.occupation.toLowerCase()) {
        return {
            valid: false,
            reason: "Occupation must be: ".concat(criteria.occupation),
        };
    }
    return { valid: true };
}
/**
 * Check units consumed (electricity, energy)
 */
function checkUnitsConsumed(user, criteria) {
    if (criteria.max_units_consumed === undefined) {
        return { valid: true };
    }
    if (user.units_consumed === undefined) {
        return { valid: false, reason: 'Units consumed not provided' };
    }
    if (user.units_consumed > criteria.max_units_consumed) {
        return {
            valid: false,
            reason: "Consumption must not exceed ".concat(criteria.max_units_consumed, " units"),
        };
    }
    return { valid: true };
}
/**
 * Check land ownership limits
 */
function checkLandSize(user, criteria) {
    if (criteria.max_land_size_acres === undefined) {
        return { valid: true };
    }
    if (user.max_land_size_acres === undefined) {
        return { valid: false, reason: 'Land size not provided' };
    }
    if (user.max_land_size_acres > criteria.max_land_size_acres) {
        return {
            valid: false,
            reason: "Land must not exceed ".concat(criteria.max_land_size_acres, " acres"),
        };
    }
    return { valid: true };
}
/**
 * Check attendance percentage requirement
 */
function checkAttendance(user, criteria) {
    if (criteria.min_attendance_percent === undefined) {
        return { valid: true };
    }
    if (user.min_attendance_percent === undefined) {
        return { valid: false, reason: 'Attendance percentage not provided' };
    }
    if (user.min_attendance_percent < criteria.min_attendance_percent) {
        return {
            valid: false,
            reason: "Attendance must be at least ".concat(criteria.min_attendance_percent, "%"),
        };
    }
    return { valid: true };
}
/**
 * Validate all criteria for a scheme
 */
function validateCriteria(user, schemeCriteria) {
    var _a;
    // Check all criteria in sequence
    var checks = [
        checkAge(user, schemeCriteria),
        checkGender(user, schemeCriteria),
        checkStateResident(user, schemeCriteria),
        checkCategory(user, schemeCriteria),
        checkIncome(user, schemeCriteria, ((_a = user.state) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('rural')) ? 'rural' : 'urban'),
        checkBooleanFlags(user, schemeCriteria),
        checkRationCard(user, schemeCriteria),
        checkBPLStatus(user, schemeCriteria),
        checkOccupation(user, schemeCriteria),
        checkUnitsConsumed(user, schemeCriteria),
        checkLandSize(user, schemeCriteria),
        checkAttendance(user, schemeCriteria),
    ];
    // Return first failed check
    for (var _i = 0, checks_1 = checks; _i < checks_1.length; _i++) {
        var check = checks_1[_i];
        if (!check.valid) {
            return check;
        }
    }
    return { valid: true };
}
/**
 * Calculate confidence score for a user-scheme match
 */
function calculateConfidence(user, scheme) {
    var weights = scheme.confidence_weight || {};
    var totalScore = 0;
    var totalWeight = 0;
    for (var _i = 0, _a = Object.entries(weights); _i < _a.length; _i++) {
        var _b = _a[_i], weightKey = _b[0], weight = _b[1];
        if (typeof weight !== 'number')
            continue;
        totalWeight += weight;
        var keyScores = 0;
        var criteria = scheme.criteria;
        // Map weight keys to criteria checks with partial scoring
        if (weightKey === 'income' && (criteria.max_income !== undefined ||
            criteria.max_income_rural !== undefined ||
            criteria.max_income_urban !== undefined ||
            criteria.income_limits !== undefined)) {
            var incomeCheck = checkIncome(user, criteria);
            if (incomeCheck.valid) {
                keyScores = 1.0; // Full score if valid
            }
            else if (user.annual_income !== undefined) {
                // Partial score based on how close they are to the limit
                var maxIncome = criteria.max_income || criteria.max_income_rural || criteria.max_income_urban || 300000;
                var proximityRatio = 1 - Math.min(1, (user.annual_income - maxIncome) / maxIncome);
                keyScores = Math.max(0, proximityRatio * 0.4); // Up to 40% for being close
            }
        }
        else if (weightKey === 'age' && (criteria.min_age !== undefined || criteria.max_age !== undefined)) {
            var ageCheck = checkAge(user, criteria);
            if (ageCheck.valid) {
                keyScores = 1.0;
            }
            else if (user.age !== undefined) {
                // Partial score based on how close to acceptable age range
                var minAge = criteria.min_age || 18;
                var maxAge = criteria.max_age || 65;
                var range = maxAge - minAge;
                var closestBound = Math.min(Math.abs(user.age - minAge), Math.abs(user.age - maxAge));
                var proximityRatio = 1 - Math.min(1, closestBound / (range || 20));
                keyScores = Math.max(0, proximityRatio * 0.3); // Up to 30% for being close
            }
        }
        else if (weightKey === 'caste' && criteria.categories) {
            var categoryCheck = checkCategory(user, criteria);
            keyScores = categoryCheck.valid ? 1.0 : 0;
        }
        else if (weightKey === 'ration_card' && criteria.ration_card_required) {
            var rationCheck = checkRationCard(user, criteria);
            keyScores = rationCheck.valid ? 1.0 : 0;
        }
        else if (weightKey === 'bpl_status' && criteria.bpl_required) {
            var bplCheck = checkBPLStatus(user, criteria);
            keyScores = bplCheck.valid ? 1.0 : 0;
        }
        else if (weightKey === 'occupation' && criteria.occupation) {
            var occupationCheck = checkOccupation(user, criteria);
            keyScores = occupationCheck.valid ? 1.0 : 0;
        }
        else if (weightKey === 'status' && criteria.is_unemployed) {
            keyScores = user.is_unemployed === true ? 1.0 : 0;
        }
        else if (weightKey === 'land_ownership' && criteria.land_owner) {
            keyScores = user.is_land_owner === true ? 1.0 : 0;
        }
        else if (weightKey === 'housing_status' && criteria.homeless) {
            keyScores = user.homeless === true ? 1.0 : 0;
        }
        else if (weightKey === 'consumption' && criteria.max_units_consumed) {
            var consumptionCheck = checkUnitsConsumed(user, criteria);
            keyScores = consumptionCheck.valid ? 1.0 : 0;
        }
        else if (weightKey === 'shg_membership' && criteria.is_shg_member) {
            keyScores = user.is_shg_member === true ? 1.0 : 0;
        }
        else if (weightKey === 'attendance' && criteria.min_attendance_percent) {
            var attendanceCheck = checkAttendance(user, criteria);
            if (attendanceCheck.valid) {
                keyScores = 1.0;
            }
            else if (user.min_attendance_percent !== undefined) {
                // Partial score based on attendance percentage
                var minReq = criteria.min_attendance_percent || 75;
                var diff = minReq - user.min_attendance_percent;
                var proximityRatio = Math.max(0, 1 - (diff / minReq));
                keyScores = proximityRatio * 0.5; // Up to 50% for being close to attendance
            }
        }
        else if (weightKey === 'trade' && criteria.is_artisan) {
            keyScores = user.is_artisan === true ? 1.0 : 0;
        }
        else if (weightKey === 'rooftop_availability' && criteria.suitable_rooftop) {
            keyScores = user.suitable_rooftop === true ? 1.0 : 0;
        }
        else if (weightKey === 'location' && criteria.is_in_targeted_district) {
            keyScores = user.is_in_targeted_district === true ? 1.0 : 0;
        }
        else if (weightKey === 'taxpayer_status' && criteria.is_taxpayer !== undefined) {
            keyScores = user.is_taxpayer === criteria.is_taxpayer ? 1.0 : 0;
        }
        else if (weightKey === 'residence' && criteria.state_resident) {
            var stateCheck = checkStateResident(user, criteria);
            keyScores = stateCheck.valid ? 1.0 : 0;
        }
        totalScore += keyScores * weight;
    }
    // Return normalized confidence (0 to 1)
    if (totalWeight === 0)
        return 0;
    var confidence = totalScore / totalWeight;
    return Math.min(1, Math.round(confidence * 100) / 100); // Cap at 1.0, round to 2 decimals
}
/**
 * Evaluate eligibility for a single scheme
 */
function evaluateScheme(user, scheme) {
    var _a;
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
    var validationResult = validateCriteria(user, scheme.criteria);
    var eligible = validationResult.valid;
    // Calculate confidence regardless of eligibility (for partial matches)
    var confidence = calculateConfidence(user, scheme);
    // 100% Foolproof Penalties: Any fundamental parameter contradiction zeros the match entirely
    var hasStrictContradiction = false;
    var allChecks = [
        checkAge(user, scheme.criteria),
        checkGender(user, scheme.criteria),
        checkStateResident(user, scheme.criteria),
        checkCategory(user, scheme.criteria),
        checkIncome(user, scheme.criteria, ((_a = user.state) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('rural')) ? 'rural' : 'urban'),
        checkBooleanFlags(user, scheme.criteria),
        checkRationCard(user, scheme.criteria),
        checkBPLStatus(user, scheme.criteria),
        checkOccupation(user, scheme.criteria),
        checkUnitsConsumed(user, scheme.criteria),
        checkLandSize(user, scheme.criteria),
        checkAttendance(user, scheme.criteria),
    ];
    for (var _i = 0, allChecks_1 = allChecks; _i < allChecks_1.length; _i++) {
        var check = allChecks_1[_i];
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
        eligible: eligible,
        confidence: confidence,
        missing_criteria: eligible ? [] : (validationResult.reason ? [validationResult.reason] : []),
        required_documents: eligible ? scheme.documents : [],
    };
}
// ==================== MAIN FUNCTIONS ====================
/**
 * Load schemes from JSON dataset
 */
function loadSchemes(dataPath) {
    try {
        // Use provided path or default to schemes_dataset.json in same directory
        var filePath = dataPath || path.join(__dirname, 'schemes_dataset.json');
        var fileContent = fs.readFileSync(filePath, 'utf-8');
        var schemes = JSON.parse(fileContent);
        return schemes;
    }
    catch (error) {
        console.error('Error loading schemes:', error);
        return [];
    }
}
/**
 * Main function: Check eligibility for all schemes
 */
function checkEligibility(userProfile, dataPath) {
    var schemes = loadSchemes(dataPath);
    if (schemes.length === 0) {
        console.warn('No schemes loaded');
        return [];
    }
    var results = [];
    for (var _i = 0, schemes_1 = schemes; _i < schemes_1.length; _i++) {
        var scheme = schemes_1[_i];
        var result = evaluateScheme(userProfile, scheme);
        results.push(result);
    }
    return results;
}
exports.default = { loadSchemes: loadSchemes, checkEligibility: checkEligibility, evaluateScheme: evaluateScheme };
