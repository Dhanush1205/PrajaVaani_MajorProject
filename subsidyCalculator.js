/* ═══════════════════════════════════════════════════════════════
   FARMER SUBSIDY & SUPPORT CALCULATOR MODULE
   PrajaVaani — Frontend-only, no backend required
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Currency formatter ──
    function formatCurrency(amount) {
        if (amount == null || isNaN(amount)) return '—';
        return '₹' + Number(amount).toLocaleString('en-IN');
    }

    // ── Read all form values into a profile object ──
    function getFarmerProfile() {
        const val = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };
        const num = (id) => {
            const v = parseFloat(val(id));
            return isNaN(v) ? null : v;
        };
        const bool = (id) => {
            const el = document.getElementById(id);
            if (!el) return false;
            if (el.type === 'checkbox') return el.checked;
            return el.value === 'yes';
        };

        return {
            // Section 1 — Personal
            age: num('sc-age'),
            gender: val('sc-gender') || null,
            state: val('sc-state') || 'Telangana',
            district: val('sc-district') || null,
            caste: val('sc-caste') || null,
            annual_income: num('sc-income'),

            // Section 2 — Farmer Profile
            farmer_type: val('sc-farmer-type') || null,
            is_farmer: bool('sc-is-farmer'),
            is_tenant_farmer: bool('sc-is-tenant'),
            is_land_owner: bool('sc-is-landowner'),
            owns_agricultural_land: bool('sc-owns-agri-land'),
            land_size_acres: num('sc-land-size'),
            crop_type: val('sc-crop-type') || null,
            is_in_targeted_district: bool('sc-targeted-district'),
            notified_area_crop: bool('sc-notified-crop'),

            // Section 3 — Household / Financial
            is_taxpayer: bool('sc-taxpayer'),
            own_house: bool('sc-own-house'),
            suitable_rooftop: bool('sc-suitable-rooftop'),
            is_shg_member: bool('sc-shg-member'),
            regular_repayment: bool('sc-regular-repayment'),
            has_ration_card: bool('sc-has-ration'),
            ration_card_type: val('sc-ration-type') || null,

            // Section 4 — Cost Inputs
            machinery_cost: num('sc-machinery-cost'),
            irrigation_cost: num('sc-irrigation-cost'),
            electricity_units: num('sc-electricity-units'),

            // Section 5 — Special Flags
            is_landless_laborer: bool('sc-landless-laborer'),
            has_mgnregs_days: bool('sc-mgnregs-days'),
            is_institutional_holder: bool('sc-institutional-holder')
        };
    }

    // ═════════════════════════════════════════════════════
    //  SCHEME EVALUATORS  — each returns a result object
    // ═════════════════════════════════════════════════════

    function evaluateRythuBharosa(p) {
        const res = {
            id: 'rythu-bharosa',
            title: 'Rythu Bharosa (2025-26 Edition)',
            type: 'Direct Cash Support',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Land Passbook (Pattadar)', 'Aadhaar Card', 'Bank Account Details', 'Tenant Agreement (if applicable)'],
            note: ''
        };

        if (p.state !== 'Telangana') res.missingCriteria.push('Not eligible: must be a Telangana resident');
        if (!p.is_farmer) res.missingCriteria.push('Not eligible: must be a farmer');
        if (!p.is_land_owner) res.missingCriteria.push('Not eligible: land ownership required');

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            if (p.land_size_acres != null && p.land_size_acres > 0) {
                res.estimatedAmount = p.land_size_acres * 15000;
                res.displayValue = formatCurrency(res.estimatedAmount) + ' per year';
                res.formula = p.land_size_acres + ' acres × ₹15,000 per acre';
            } else {
                res.status = 'partial';
                res.displayValue = '₹15,000 per acre per year';
                res.formula = 'Land size × ₹15,000 — enter acreage for exact amount';
                res.note = 'More information needed: enter land size in acres for exact benefit calculation';
            }
        }
        return res;
    }

    function evaluatePMKisan(p) {
        const res = {
            id: 'pm-kisan',
            title: 'PM-KISAN',
            type: 'Direct Cash Support',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Land Records', 'Bank Account Details'],
            note: ''
        };

        if (!p.is_land_owner) res.missingCriteria.push('Not eligible: land ownership required');
        if (p.is_taxpayer) res.missingCriteria.push('Not eligible: income taxpayers are excluded');
        if (p.is_institutional_holder) res.missingCriteria.push('Not eligible: institutional land holders are excluded');

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            res.estimatedAmount = 6000;
            res.displayValue = '₹6,000 per year';
            res.formula = '₹2,000 × 3 installments per year';
        }
        return res;
    }

    function evaluateIndirammaAtmiyaBharosa(p) {
        const res = {
            id: 'indiramma-atmiya-bharosa',
            title: 'Indiramma Atmiya Bharosa',
            type: 'Direct Cash Support',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Pattadar Passbook (if land owner)', 'Bank Account Details', 'MGNREGS Job Card'],
            note: ''
        };

        if (p.state !== 'Telangana') res.missingCriteria.push('Not eligible: must be a Telangana resident');

        const isFarmerOrLaborer = p.is_farmer || p.is_landless_laborer;
        if (!isFarmerOrLaborer) res.missingCriteria.push('Not eligible: must be a farmer or landless agricultural laborer');

        if (p.is_landless_laborer && !p.has_mgnregs_days) {
            res.missingCriteria.push('Not eligible: must have completed at least 20 MGNREGS work days for laborer support path');
        }

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            res.estimatedAmount = 12000;
            res.displayValue = '₹12,000 per year';
            res.formula = '₹12,000 annual support to eligible farmers / agricultural laborers';
        }
        return res;
    }

    function evaluateRythuBima(p) {
        const res = {
            id: 'rythu-bima',
            title: 'Rythu Bima',
            type: 'Insurance Coverage',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Pattadar Passbook', 'Bank Account Details', 'Nominee Details'],
            note: ''
        };

        if (p.state !== 'Telangana') res.missingCriteria.push('Not eligible: must be a Telangana resident');
        if (p.age != null && (p.age < 18 || p.age > 59)) res.missingCriteria.push('Not eligible: age must be between 18 and 59');
        if (p.age == null) res.missingCriteria.push('More information needed: enter your age');
        if (!p.is_farmer) res.missingCriteria.push('Not eligible: must be a farmer');
        if (!p.is_land_owner) res.missingCriteria.push('Not eligible: land ownership required');
        if (p.land_size_acres != null && p.land_size_acres > 5) res.missingCriteria.push('Not eligible: land size must be ≤ 5 acres');

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            res.estimatedAmount = 500000;
            res.displayValue = '₹5,00,000 life insurance cover';
            res.formula = 'Government-funded life insurance for eligible farmers';
            res.note = 'This is insurance coverage, not a direct cash subsidy';
        }
        return res;
    }

    function evaluatePMFBY(p) {
        const res = {
            id: 'pmfby',
            title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
            type: 'Insurance Coverage',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Land Records or Tenancy Proof', 'Sowing Certificate', 'Bank Account Details'],
            note: ''
        };

        if (!p.is_farmer) res.missingCriteria.push('Not eligible: must be a farmer');
        if (!p.notified_area_crop) res.missingCriteria.push('Not eligible: crop must be in a notified area');

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            res.displayValue = 'Eligible for crop insurance coverage';
            res.formula = 'Exact premium/claim depends on crop, season, and notified area';
            res.note = 'Contact local agriculture office for season-specific premium details';
        }
        return res;
    }

    function evaluateFarmMechanization(p) {
        const res = {
            id: 'farm-mechanization',
            title: 'Farm Mechanization Scheme',
            type: 'Subsidy on Purchase / Infrastructure',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Land Records', 'Bank Passbook'],
            note: ''
        };

        if (p.state !== 'Telangana') res.missingCriteria.push('Not eligible: must be a Telangana resident');
        if (!p.is_farmer) res.missingCriteria.push('Not eligible: must be a farmer');
        if (!p.is_land_owner) res.missingCriteria.push('Not eligible: land ownership required');

        if (res.missingCriteria.length === 0) {
            if (p.machinery_cost != null && p.machinery_cost > 0) {
                res.eligible = true;
                res.status = 'eligible';
                const rate = (p.gender === 'Female') ? 0.50 : 0.40;
                const rateLabel = (p.gender === 'Female') ? '50%' : '40%';
                res.estimatedAmount = Math.round(p.machinery_cost * rate);
                res.displayValue = formatCurrency(res.estimatedAmount) + ' subsidy';
                res.formula = formatCurrency(p.machinery_cost) + ' × ' + rateLabel + (p.gender === 'Female' ? ' (women farmer benefit)' : '');
            } else {
                res.eligible = true;
                res.status = 'partial';
                res.displayValue = p.gender === 'Female' ? '50% subsidy on machinery' : '40% subsidy on machinery';
                res.formula = 'Enter machinery purchase cost for exact subsidy amount';
                res.note = 'More information needed: enter machinery purchase cost';
            }
        }
        return res;
    }

    function evaluateDripSprinkler(p) {
        const res = {
            id: 'drip-sprinkler',
            title: 'Drip & Sprinkler Subsidy (Micro Irrigation)',
            type: 'Subsidy on Purchase / Infrastructure',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Pattadar Passbook', 'Title Deed', 'Caste Certificate'],
            note: ''
        };

        if (p.state !== 'Telangana') res.missingCriteria.push('Not eligible: must be a Telangana resident');
        if (!p.is_farmer) res.missingCriteria.push('Not eligible: must be a farmer');
        if (!p.is_land_owner) res.missingCriteria.push('Not eligible: land ownership required');

        if (res.missingCriteria.length === 0) {
            let rate = 0.80;
            let rateLabel = '80%';
            const caste = (p.caste || '').toUpperCase();
            if (caste === 'SC' || caste === 'ST') {
                rate = 1.0; rateLabel = '100%';
            } else if (['BC', 'OBC', 'EBC', 'MINORITY'].includes(caste)) {
                rate = 0.90; rateLabel = '90%';
            }

            if (p.irrigation_cost != null && p.irrigation_cost > 0) {
                res.eligible = true;
                res.status = 'eligible';
                res.estimatedAmount = Math.round(p.irrigation_cost * rate);
                res.displayValue = formatCurrency(res.estimatedAmount) + ' subsidy';
                res.formula = formatCurrency(p.irrigation_cost) + ' × ' + rateLabel + ' (Category: ' + (p.caste || 'General') + ')';
            } else {
                res.eligible = true;
                res.status = 'partial';
                res.displayValue = rateLabel + ' subsidy on micro irrigation';
                res.formula = 'Enter irrigation system cost for exact subsidy amount';
                res.note = 'More information needed: enter irrigation system cost';
            }
        }
        return res;
    }

    function evaluateSoilHealthCard(p) {
        const res = {
            id: 'soil-health-card',
            title: 'Soil Health Card Scheme',
            type: 'Service / Development Support',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Land Records'],
            note: ''
        };

        if (!p.is_farmer) res.missingCriteria.push('Not eligible: must be a farmer');
        if (!p.owns_agricultural_land) res.missingCriteria.push('Not eligible: must own agricultural land');

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            res.displayValue = 'Free soil testing and soil health recommendations';
            res.formula = 'Government-provided soil testing service at no cost';
        }
        return res;
    }

    function evaluateKCC(p) {
        const res = {
            id: 'kisan-credit-card',
            title: 'Kisan Credit Card (KCC)',
            type: 'Credit / Loan Support',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Land Records', 'Pattadar Passbook', 'Bank Statement'],
            note: ''
        };

        if (!p.is_farmer) res.missingCriteria.push('Not eligible: must be a farmer');
        if (p.age != null && (p.age < 18 || p.age > 75)) res.missingCriteria.push('Not eligible: age must be between 18 and 75');
        if (p.age == null) res.missingCriteria.push('More information needed: enter your age');

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            res.displayValue = 'Agricultural credit support up to ₹3,00,000';
            res.formula = 'Credit limit depends on bank assessment and land holding';
            res.note = 'This is a credit facility, not a direct cash subsidy';
        }
        return res;
    }

    function evaluateVaddileniRunalu(p) {
        const res = {
            id: 'vaddileni-runalu',
            title: 'Vaddileni Runalu',
            type: 'Credit / Loan Support',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Bank Loan Documents', 'SHG Membership Proof', 'Land Records'],
            note: ''
        };

        if (p.state !== 'Telangana') res.missingCriteria.push('Not eligible: must be a Telangana resident');
        const isFarmerOrSHG = p.is_farmer || p.is_shg_member;
        if (!isFarmerOrSHG) res.missingCriteria.push('Not eligible: must be a farmer or SHG member');
        if (!p.regular_repayment) res.missingCriteria.push('Not eligible: regular repayment history required');

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            res.displayValue = 'Interest-free crop loan up to ₹1,00,000 + SHG interest reimbursement';
            res.formula = 'Government reimburses interest on timely-repaid crop loans and SHG-linked credit';
            res.note = 'This is interest reimbursement support, not a direct cash subsidy';
        }
        return res;
    }

    function evaluatePMDhanDhaanya(p) {
        const res = {
            id: 'pm-dhan-dhaanya',
            title: 'PM Dhan-Dhaanya Krishi Yojana (PM-DDKY)',
            type: 'Service / Development Support',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Land Records', 'KCC Card'],
            note: ''
        };

        if (!p.is_in_targeted_district) res.missingCriteria.push('Not eligible: must be in a targeted district');
        if (!p.is_farmer) res.missingCriteria.push('Not eligible: must be a farmer');

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            res.displayValue = 'Enhanced district agricultural support, cold storage & development benefits';
            res.formula = 'District-level agricultural development support under central scheme';
        }
        return res;
    }

    function evaluatePMSuryaGhar(p) {
        const res = {
            id: 'pm-surya-ghar',
            title: 'PM Surya Ghar Muft Bijli Yojana',
            type: 'Subsidy on Purchase / Infrastructure',
            eligible: false,
            status: 'not-eligible',
            estimatedAmount: null,
            displayValue: '',
            formula: '',
            missingCriteria: [],
            documents: ['Aadhaar Card', 'Electricity Bill', 'Consumer Number', 'Property Documents'],
            note: ''
        };

        if (!p.own_house) res.missingCriteria.push('Not eligible: house ownership required');
        if (!p.suitable_rooftop) res.missingCriteria.push('Not eligible: suitable rooftop required for solar installation');

        if (res.missingCriteria.length === 0) {
            res.eligible = true;
            res.status = 'eligible';
            res.displayValue = 'Rooftop solar subsidy and free electricity support';
            res.formula = 'Subsidy up to ₹78,000 for 3kW system under PM Surya Ghar norms';
            res.note = 'This is an opportunity support scheme beneficial for farming households';
        }
        return res;
    }

    // ── Run all evaluators ──
    function evaluateAllSchemes(profile) {
        return [
            evaluateRythuBharosa(profile),
            evaluatePMKisan(profile),
            evaluateIndirammaAtmiyaBharosa(profile),
            evaluateRythuBima(profile),
            evaluatePMFBY(profile),
            evaluateFarmMechanization(profile),
            evaluateDripSprinkler(profile),
            evaluateSoilHealthCard(profile),
            evaluateKCC(profile),
            evaluateVaddileniRunalu(profile),
            evaluatePMDhanDhaanya(profile),
            evaluatePMSuryaGhar(profile)
        ];
    }

    // ── Summary calculation ──
    function calculateSummary(results) {
        const eligibleResults = results.filter(r => r.eligible);
        const cashSchemes = ['rythu-bharosa', 'pm-kisan', 'indiramma-atmiya-bharosa'];
        const subsidySchemes = ['farm-mechanization', 'drip-sprinkler'];
        const insuranceSchemes = ['rythu-bima', 'pmfby'];

        let totalCash = 0;
        let totalSubsidy = 0;
        let totalInsurance = 0;
        let creditServiceCount = 0;

        eligibleResults.forEach(r => {
            if (cashSchemes.includes(r.id) && r.estimatedAmount != null) {
                totalCash += r.estimatedAmount;
            } else if (subsidySchemes.includes(r.id) && r.estimatedAmount != null) {
                totalSubsidy += r.estimatedAmount;
            } else if (insuranceSchemes.includes(r.id) && r.estimatedAmount != null) {
                totalInsurance += r.estimatedAmount;
            }
            if (['Credit / Loan Support', 'Service / Development Support'].includes(r.type)) {
                creditServiceCount++;
            }
        });

        return {
            eligibleCount: eligibleResults.length,
            totalSchemes: results.length,
            totalCash,
            totalSubsidy,
            totalInsurance,
            creditServiceCount
        };
    }

    // ═════════════════════════════════════════════════════
    //  RENDERING
    // ═════════════════════════════════════════════════════

    function renderSummaryCards(summary) {
        const cards = [
            { icon: '✅', label: 'Eligible Schemes', value: summary.eligibleCount + ' / ' + summary.totalSchemes, color: '#00e676' },
            { icon: '💰', label: 'Direct Cash Support', value: summary.totalCash > 0 ? formatCurrency(summary.totalCash) + '/yr' : '—', color: '#ff9100' },
            { icon: '🔧', label: 'Purchase Subsidy', value: summary.totalSubsidy > 0 ? formatCurrency(summary.totalSubsidy) : '—', color: '#2979ff' },
            { icon: '🛡️', label: 'Insurance Coverage', value: summary.totalInsurance > 0 ? formatCurrency(summary.totalInsurance) : '—', color: '#ab47bc' },
            { icon: '📋', label: 'Credit / Services', value: summary.creditServiceCount > 0 ? summary.creditServiceCount + ' schemes' : '—', color: '#26c6da' }
        ];

        return `
        <div class="sc-summary-grid">
            ${cards.map(c => `
                <div class="sc-summary-card" style="border-top: 3px solid ${c.color};">
                    <div class="sc-summary-icon" style="color: ${c.color};">${c.icon}</div>
                    <div class="sc-summary-label">${c.label}</div>
                    <div class="sc-summary-value" style="color: ${c.color};">${c.value}</div>
                </div>
            `).join('')}
        </div>
        `;
    }

    function getStatusBadge(result) {
        if (result.status === 'eligible') return '<span class="sc-badge sc-badge-eligible">✅ Eligible</span>';
        if (result.status === 'partial') return '<span class="sc-badge sc-badge-partial">⚠️ Partially Evaluable</span>';
        return '<span class="sc-badge sc-badge-ineligible">❌ Not Eligible</span>';
    }

    function getTypeIcon(type) {
        const icons = {
            'Direct Cash Support': '💰',
            'Insurance Coverage': '🛡️',
            'Subsidy on Purchase / Infrastructure': '🔧',
            'Credit / Loan Support': '🏦',
            'Service / Development Support': '🌱'
        };
        return icons[type] || '📋';
    }

    function renderSchemeCard(result) {
        const borderColor = result.status === 'eligible' ? 'rgba(0,230,118,0.4)' :
            result.status === 'partial' ? 'rgba(255,193,7,0.4)' : 'rgba(255,82,82,0.35)';
        const bgTint = result.status === 'eligible' ? 'rgba(0,230,118,0.03)' :
            result.status === 'partial' ? 'rgba(255,193,7,0.03)' : 'rgba(255,82,82,0.03)';

        return `
        <div class="sc-result-card" style="border-color: ${borderColor}; background: linear-gradient(135deg, ${bgTint}, var(--glass-bg));">
            <div class="sc-result-header">
                <div class="sc-result-title-area">
                    <span class="sc-result-type-icon">${getTypeIcon(result.type)}</span>
                    <div>
                        <h4 class="sc-result-title">${result.title}</h4>
                        <span class="sc-result-type-label">${result.type}</span>
                    </div>
                </div>
                ${getStatusBadge(result)}
            </div>
            <div class="sc-result-body">
                ${result.displayValue ? `
                <div class="sc-benefit-box ${result.eligible ? 'sc-benefit-eligible' : ''}">
                    <span class="sc-benefit-label">Estimated Benefit</span>
                    <span class="sc-benefit-value">${result.displayValue}</span>
                </div>` : ''}
                ${result.formula ? `
                <div class="sc-formula-row">
                    <span class="sc-formula-icon">📐</span>
                    <span class="sc-formula-text">${result.formula}</span>
                </div>` : ''}
                ${result.note ? `
                <div class="sc-note-row">
                    <span class="sc-note-icon">ℹ️</span>
                    <span class="sc-note-text">${result.note}</span>
                </div>` : ''}
                ${result.missingCriteria.length > 0 ? `
                <div class="sc-missing-section">
                    <span class="sc-missing-title">Why not eligible:</span>
                    <ul class="sc-missing-list">
                        ${result.missingCriteria.map(m => `<li>${m}</li>`).join('')}
                    </ul>
                </div>` : ''}
                <div class="sc-docs-section">
                    <span class="sc-docs-title">📄 Required Documents</span>
                    <div class="sc-docs-list">
                        ${result.documents.map(d => `<span class="sc-doc-chip">${d}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function renderResults(results) {
        const groups = {
            'Direct Cash Support': [],
            'Insurance Coverage': [],
            'Subsidy on Purchase / Infrastructure': [],
            'Credit / Loan Support': [],
            'Service / Development Support': []
        };

        results.forEach(r => {
            if (groups[r.type]) groups[r.type].push(r);
        });

        let html = '';
        for (const [groupName, items] of Object.entries(groups)) {
            if (items.length === 0) continue;
            html += `
            <div class="sc-group">
                <h3 class="sc-group-title">${getTypeIcon(groupName)} ${groupName}</h3>
                <div class="sc-group-cards">
                    ${items.map(r => renderSchemeCard(r)).join('')}
                </div>
            </div>
            `;
        }
        return html;
    }

    // ═════════════════════════════════════════════════════
    //  FORM HTML
    // ═════════════════════════════════════════════════════

    function renderSubsidyCalculatorTab() {
        return `
        <style>
            /* ── Calculator Container ── */
            .sc-container { max-width: 960px; margin: 0 auto; }

            .sc-hero {
                text-align: center;
                padding: 2rem 1.5rem 2.5rem;
                background: var(--glass-bg);
                backdrop-filter: var(--backdrop-blur);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-lg);
                margin-bottom: 2rem;
                box-shadow: var(--glass-shadow);
                position: relative;
                overflow: hidden;
            }
            .sc-hero::before {
                content: '';
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 4px;
                background: linear-gradient(90deg, #00e676, #ff9100, #2979ff);
            }
            .sc-hero-title {
                font-size: 2rem;
                font-weight: 800;
                color: var(--text-main);
                margin-bottom: 0.5rem;
                letter-spacing: -0.3px;
            }
            .sc-hero-subtitle {
                font-size: 1rem;
                color: var(--text-muted);
                font-weight: 500;
            }

            /* ── Form Card ── */
            .sc-form-card {
                background: var(--glass-bg);
                backdrop-filter: var(--backdrop-blur);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-lg);
                padding: 2rem;
                box-shadow: var(--glass-shadow);
                margin-bottom: 2rem;
            }

            .sc-section-header {
                background: rgba(41, 121, 255, 0.1);
                border-left: 4px solid #2979ff;
                border-radius: 8px;
                padding: 0.8rem 1rem;
                margin: 1.5rem 0 1rem 0;
                display: flex;
                align-items: center;
                gap: 0.6rem;
            }
            .sc-section-header:first-child { margin-top: 0; }
            .sc-section-header span { font-size: 1.1rem; }
            .sc-section-header p {
                margin: 0;
                font-size: 0.9rem;
                font-weight: 700;
                color: var(--text-main);
            }

            .sc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
            .sc-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.8rem; }

            .sc-field { display: flex; flex-direction: column; }
            .sc-label {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-muted);
                margin-bottom: 0.4rem;
            }
            .sc-label .req { color: #ff5252; }

            .sc-input, .sc-select {
                width: 100%;
                padding: 0.75rem 0.9rem;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: var(--radius-md);
                background: rgba(0,0,0,0.25);
                color: var(--text-main);
                font-size: 0.9rem;
                font-family: inherit;
                transition: all 0.25s ease;
            }
            .sc-input:focus, .sc-select:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 12px rgba(255,109,0,0.15);
                background: rgba(0,0,0,0.35);
            }
            .sc-input::placeholder { color: rgba(255,255,255,0.25); }
            .sc-select option { background: #1e293b; color: #fff; }

            /* Toggle (Yes/No select) */
            .sc-toggle-group {
                display: flex;
                flex-wrap: wrap;
                gap: 0.6rem;
                margin-top: 0.1rem;
            }
            .sc-toggle-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.85rem;
                font-weight: 500;
                color: var(--text-muted);
                cursor: pointer;
                padding: 0.4rem 0;
            }
            .sc-toggle-item input[type="checkbox"] {
                width: 1rem; height: 1rem;
                accent-color: #00e676;
                cursor: pointer;
            }

            /* Calculate Button */
            .sc-calc-btn {
                width: 100%;
                margin-top: 1.5rem;
                padding: 1rem;
                border: none;
                border-radius: var(--radius-pill);
                background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
                color: #0d1b2a;
                font-size: 1.05rem;
                font-weight: 800;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 20px rgba(0,230,118,0.3);
                text-transform: uppercase;
                letter-spacing: 0.06em;
                position: relative;
                overflow: hidden;
            }
            .sc-calc-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 30px rgba(0,230,118,0.45);
            }
            .sc-calc-btn:active { transform: translateY(0); }
            .sc-calc-btn::after {
                content: '';
                position: absolute;
                top: 0; left: -100%;
                width: 100%; height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
                transition: 0.5s;
            }
            .sc-calc-btn:hover::after { left: 100%; }

            /* ── Results ── */
            .sc-results-area { margin-top: 2rem; }

            .sc-summary-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 1rem;
                margin-bottom: 2rem;
            }
            .sc-summary-card {
                background: var(--glass-bg);
                backdrop-filter: var(--backdrop-blur);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-lg);
                padding: 1.2rem 1rem;
                text-align: center;
                box-shadow: var(--glass-shadow);
                transition: transform 0.3s ease;
            }
            .sc-summary-card:hover { transform: translateY(-3px); }
            .sc-summary-icon { font-size: 1.6rem; margin-bottom: 0.4rem; }
            .sc-summary-label { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.3rem; }
            .sc-summary-value { font-size: 1.15rem; font-weight: 800; }

            .sc-group { margin-bottom: 2rem; }
            .sc-group-title {
                font-size: 1.15rem;
                font-weight: 700;
                color: var(--text-main);
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--glass-border);
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .sc-group-cards {
                display: grid;
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            /* Individual Result Card */
            .sc-result-card {
                background: var(--glass-bg);
                backdrop-filter: var(--backdrop-blur);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                box-shadow: var(--glass-shadow);
                transition: transform 0.25s ease, box-shadow 0.25s ease;
            }
            .sc-result-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(0,0,0,0.25);
            }
            .sc-result-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1rem;
                flex-wrap: wrap;
                gap: 0.5rem;
            }
            .sc-result-title-area {
                display: flex;
                align-items: flex-start;
                gap: 0.8rem;
            }
            .sc-result-type-icon { font-size: 1.8rem; }
            .sc-result-title {
                font-size: 1.1rem;
                font-weight: 700;
                color: var(--text-main);
                margin: 0 0 0.2rem 0;
            }
            .sc-result-type-label {
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            /* Badge */
            .sc-badge {
                padding: 0.35rem 0.9rem;
                border-radius: 50px;
                font-size: 0.75rem;
                font-weight: 700;
                white-space: nowrap;
            }
            .sc-badge-eligible {
                background: rgba(0,230,118,0.12);
                color: #00e676;
                border: 1px solid rgba(0,230,118,0.3);
            }
            .sc-badge-ineligible {
                background: rgba(255,82,82,0.12);
                color: #ff5252;
                border: 1px solid rgba(255,82,82,0.3);
            }
            .sc-badge-partial {
                background: rgba(255,193,7,0.12);
                color: #ffc107;
                border: 1px solid rgba(255,193,7,0.3);
            }

            .sc-result-body { display: flex; flex-direction: column; gap: 0.8rem; }

            .sc-benefit-box {
                padding: 0.8rem 1rem;
                border-radius: var(--radius-md);
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                display: flex;
                flex-direction: column;
                gap: 0.2rem;
            }
            .sc-benefit-eligible {
                background: rgba(0,230,118,0.06);
                border-color: rgba(0,230,118,0.2);
            }
            .sc-benefit-label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
            .sc-benefit-value { font-size: 1.1rem; font-weight: 700; color: var(--text-main); }

            .sc-formula-row, .sc-note-row {
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
                font-size: 0.85rem;
                color: var(--text-muted);
                font-weight: 500;
            }
            .sc-formula-icon, .sc-note-icon { flex-shrink: 0; }

            .sc-missing-section {
                background: rgba(255,82,82,0.06);
                border: 1px solid rgba(255,82,82,0.15);
                border-radius: var(--radius-md);
                padding: 0.8rem 1rem;
            }
            .sc-missing-title {
                font-size: 0.8rem;
                font-weight: 700;
                color: #ff5252;
                display: block;
                margin-bottom: 0.3rem;
            }
            .sc-missing-list {
                margin: 0;
                padding-left: 1.2rem;
                font-size: 0.82rem;
                color: var(--text-muted);
                font-weight: 500;
                line-height: 1.7;
            }
            .sc-missing-list li { margin: 0.15rem 0; }

            .sc-docs-section { margin-top: 0.3rem; }
            .sc-docs-title {
                font-size: 0.78rem;
                font-weight: 700;
                color: var(--text-muted);
                display: block;
                margin-bottom: 0.4rem;
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }
            .sc-docs-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
            .sc-doc-chip {
                padding: 0.25rem 0.7rem;
                border-radius: 50px;
                background: rgba(41,121,255,0.1);
                color: #82b1ff;
                font-size: 0.72rem;
                font-weight: 600;
                border: 1px solid rgba(41,121,255,0.2);
            }

            /* ── Responsive ── */
            @media (max-width: 900px) {
                .sc-summary-grid { grid-template-columns: repeat(3, 1fr); }
            }
            @media (max-width: 700px) {
                .sc-grid { grid-template-columns: 1fr; }
                .sc-grid-3 { grid-template-columns: 1fr 1fr; }
                .sc-summary-grid { grid-template-columns: repeat(2, 1fr); }
                .sc-result-header { flex-direction: column; }
            }
            @media (max-width: 480px) {
                .sc-summary-grid { grid-template-columns: 1fr; }
                .sc-grid-3 { grid-template-columns: 1fr; }
            }

            /* Fade-in animation */
            @keyframes scFadeIn {
                from { opacity: 0; transform: translateY(16px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .sc-results-area { animation: scFadeIn 0.5s ease-out; }
        </style>

        <div class="sc-container">
            <!-- Hero -->
            <div class="sc-hero">
                <h2 class="sc-hero-title">🌾 Farmer Subsidy & Support Calculator</h2>
                <p class="sc-hero-subtitle">Check benefits, subsidies, insurance, and agricultural support schemes</p>
            </div>

            <!-- Form -->
            <div class="sc-form-card">
                <form id="sc-form" autocomplete="off">

                    <!-- Section 1: Personal Details -->
                    <div class="sc-section-header">
                        <span>👤</span>
                        <p>Personal Details</p>
                    </div>
                    <div class="sc-grid">
                        <div class="sc-field">
                            <label class="sc-label">Age <span class="req">*</span></label>
                            <input type="number" id="sc-age" class="sc-input" placeholder="e.g., 35" min="1" max="120">
                        </div>
                        <div class="sc-field">
                            <label class="sc-label">Gender</label>
                            <select id="sc-gender" class="sc-select">
                                <option value="">Select...</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="sc-field">
                            <label class="sc-label">State</label>
                            <select id="sc-state" class="sc-select">
                                <option value="Telangana" selected>Telangana</option>
                                <option value="Andhra Pradesh">Andhra Pradesh</option>
                                <option value="Karnataka">Karnataka</option>
                                <option value="Maharashtra">Maharashtra</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="sc-field">
                            <label class="sc-label">District</label>
                            <input type="text" id="sc-district" class="sc-input" placeholder="e.g., Warangal">
                        </div>
                        <div class="sc-field">
                            <label class="sc-label">Category / Caste</label>
                            <select id="sc-caste" class="sc-select">
                                <option value="">Select...</option>
                                <option value="SC">SC (Scheduled Caste)</option>
                                <option value="ST">ST (Scheduled Tribe)</option>
                                <option value="BC">BC (Backward Caste)</option>
                                <option value="OBC">OBC</option>
                                <option value="EBC">EBC (Extremely Backward)</option>
                                <option value="Minority">Minority</option>
                                <option value="General">General</option>
                                <option value="Golla">Golla</option>
                                <option value="Kuruma">Kuruma</option>
                                <option value="Yadava">Yadava</option>
                            </select>
                        </div>
                        <div class="sc-field">
                            <label class="sc-label">Annual Income (₹)</label>
                            <input type="number" id="sc-income" class="sc-input" placeholder="e.g., 150000" min="0">
                        </div>
                    </div>

                    <!-- Section 2: Farmer Profile -->
                    <div class="sc-section-header">
                        <span>🌾</span>
                        <p>Farmer Profile</p>
                    </div>
                    <div class="sc-grid">
                        <div class="sc-field">
                            <label class="sc-label">Farmer Type</label>
                            <select id="sc-farmer-type" class="sc-select">
                                <option value="">Select...</option>
                                <option value="Farmer">Farmer</option>
                                <option value="Tenant Farmer">Tenant Farmer</option>
                                <option value="Landless Agricultural Laborer">Landless Agricultural Laborer</option>
                            </select>
                        </div>
                        <div class="sc-field">
                            <label class="sc-label">Crop Type</label>
                            <input type="text" id="sc-crop-type" class="sc-input" placeholder="e.g., Paddy, Cotton">
                        </div>
                        <div class="sc-field">
                            <label class="sc-label">Land Size (acres)</label>
                            <input type="number" id="sc-land-size" class="sc-input" placeholder="e.g., 2.5" min="0" step="0.1">
                        </div>
                    </div>
                    <div class="sc-toggle-group" style="margin-top: 0.8rem;">
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-is-farmer"> 🌾 Farmer</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-is-tenant"> 🚜 Tenant Farmer</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-is-landowner"> 🏘️ Land Owner</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-owns-agri-land"> 🌿 Owns Agri Land</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-targeted-district"> 📍 Targeted District</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-notified-crop"> 📋 Notified Area Crop</label>
                    </div>

                    <!-- Section 3: Household / Financial -->
                    <div class="sc-section-header">
                        <span>🏠</span>
                        <p>Household & Financial Details</p>
                    </div>
                    <div class="sc-toggle-group">
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-taxpayer"> 🏛️ Taxpayer</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-own-house"> 🏠 Own House</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-suitable-rooftop"> ☀️ Suitable Rooftop</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-shg-member"> 👥 SHG Member</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-regular-repayment"> ✅ Regular Repayment</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-has-ration"> 📋 Has Ration Card</label>
                    </div>
                    <div class="sc-grid" style="margin-top: 0.8rem;">
                        <div class="sc-field">
                            <label class="sc-label">Ration Card Type</label>
                            <select id="sc-ration-type" class="sc-select">
                                <option value="">None</option>
                                <option value="White">White</option>
                                <option value="AAY">AAY</option>
                                <option value="PHH">PHH</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <!-- Section 4: Cost Inputs -->
                    <div class="sc-section-header">
                        <span>💲</span>
                        <p>Cost Inputs for Calculations</p>
                    </div>
                    <div class="sc-grid">
                        <div class="sc-field">
                            <label class="sc-label">Machinery Purchase Cost (₹)</label>
                            <input type="number" id="sc-machinery-cost" class="sc-input" placeholder="Optional" min="0">
                        </div>
                        <div class="sc-field">
                            <label class="sc-label">Irrigation System Cost (₹)</label>
                            <input type="number" id="sc-irrigation-cost" class="sc-input" placeholder="Optional" min="0">
                        </div>
                        <div class="sc-field">
                            <label class="sc-label">Monthly Electricity Units</label>
                            <input type="number" id="sc-electricity-units" class="sc-input" placeholder="Optional" min="0">
                        </div>
                    </div>

                    <!-- Section 5: Special Flags -->
                    <div class="sc-section-header">
                        <span>🚩</span>
                        <p>Special Flags</p>
                    </div>
                    <div class="sc-toggle-group">
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-landless-laborer"> 👷 Landless Laborer</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-mgnregs-days"> 📅 20+ MGNREGS Days</label>
                        <label class="sc-toggle-item"><input type="checkbox" id="sc-institutional-holder"> 🏢 Institutional Holder</label>
                    </div>

                    <button type="submit" class="sc-calc-btn" id="sc-calc-btn">
                        🌾 Calculate My Farmer Benefits
                    </button>
                </form>
            </div>

            <!-- Results Area (populated after calculation) -->
            <div id="sc-results-container"></div>
        </div>
        `;
    }

    // ── Initialization — called after tab renders ──
    function initSubsidyCalculator() {
        const form = document.getElementById('sc-form');
        if (!form) return;

        // Clone to remove any duplicate listeners
        const fresh = form.cloneNode(true);
        form.parentNode.replaceChild(fresh, form);

        document.getElementById('sc-form').addEventListener('submit', function (e) {
            e.preventDefault();

            // Validate required inputs
            const ageVal = document.getElementById('sc-age').value.trim();
            if (!ageVal) {
                alert('Please enter your age to continue.');
                document.getElementById('sc-age').focus();
                return;
            }

            // Read profile
            const profile = getFarmerProfile();

            // Evaluate all schemes
            const results = evaluateAllSchemes(profile);

            // Calculate summary
            const summary = calculateSummary(results);

            // Render output
            const container = document.getElementById('sc-results-container');
            container.innerHTML = `
                <div class="sc-results-area">
                    ${renderSummaryCards(summary)}
                    ${renderResults(results)}
                </div>
            `;

            // Smooth scroll to results
            setTimeout(() => {
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        });
    }

    // ── Expose to global scope for integration with script.js ──
    window.renderSubsidyCalculatorTab = renderSubsidyCalculatorTab;
    window.initSubsidyCalculator = initSubsidyCalculator;

})();
