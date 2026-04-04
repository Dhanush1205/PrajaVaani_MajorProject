/* ═══════════════════════════════════════════════════════════════
   FARMER SUBSIDY CALCULATOR
   Logic and UI for farmer financial assistance estimation
   Matches the Fee Reimbursement feature's design system
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Currency Formatter ──
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // ── HTML Template ──
    window.renderSubsidyCalculatorTab = function () {
        return `
        <style>
            .sc-container { max-width: 800px; margin: 0 auto; }
            .sc-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
                border: 2px solid #e8f0ff;
                border-radius: 12px;
                padding: 2.5rem;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .sc-section-label {
                background: #e1f5fe;
                border-left: 4px solid #4a90e2;
                border-radius: 8px;
                padding: 1rem;
                margin: 1.5rem 0 1rem 0;
            }
            .sc-section-label p { margin: 0; font-size: 0.95rem; font-weight: 700; color: #1a3a52; }
            .sc-label { font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem; }
            
            .sc-input, .sc-select {
                width: 100%; padding: 0.9rem 1rem;
                border: 2px solid #d4e4f7; border-radius: 8px;
                font-size: 0.95rem; font-weight: 500; color: #1a3a52;
                background: #ffffff !important; transition: all 0.3s ease;
                font-family: inherit; -webkit-appearance: none;
            }
            .sc-input:focus, .sc-select:focus {
                border-color: #4a90e2;
                box-shadow: 0 0 0 3px rgba(74,144,226,0.1);
                outline: none;
            }
            .sc-checkbox-group {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
                margin-top: 0.5rem;
            }
            .sc-checkbox-item {
                display: flex;
                align-items: center;
                gap: 0.8rem;
                background: #fff;
                padding: 1rem;
                border: 2px solid #d4e4f7;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .sc-checkbox-item:hover {
                border-color: #4a90e2;
                background: #e1f5fe;
            }
            .sc-checkbox-item input {
                width: 1.2rem;
                height: 1.2rem;
                cursor: pointer;
                accent-color: #22863a;
            }
            .sc-checkbox-item label {
                font-size: 0.95rem;
                font-weight: 600;
                color: #1a3a52;
                cursor: pointer;
                flex: 1;
            }
            
            .sc-submit {
                margin-top: 2rem; width: 100%; font-weight: 700; font-size: 1.05rem;
                padding: 1.1rem; background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
                color: #1e293b; border: none; border-radius: 8px; cursor: pointer;
                transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(74,144,226,0.3);
                text-transform: uppercase; letter-spacing: 0.5px;
            }
            .sc-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(74,144,226,0.4); }
            
            .sc-result-card {
                margin-top: 2.5rem; border-radius: 12px; padding: 2.5rem;
                border: 2px solid #22863a;
                background: linear-gradient(135deg, #f5fff7 0%, #e8f9ee 100%);
                animation: scFadeIn 0.5s ease-out;
            }
            .sc-amount {
                font-size: 2.5rem; font-weight: 900; margin: 0.5rem 0;
                background: linear-gradient(135deg, #4a90e2, #22863a);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            }
            .sc-item {
                display: grid;
                grid-template-columns: 1fr auto;
                align-items: center;
                gap: 1rem;
                padding: 1rem 0;
                border-bottom: 1px solid rgba(34, 134, 58, 0.1);
                color: #1a3a52;
                font-weight: 500;
            }
            .sc-item:last-of-type { border-bottom: none; }
            .sc-formula {
                font-size: 0.85rem;
                color: #5a6c7d;
                font-weight: 400;
                display: block;
                margin-top: 0.2rem;
            }
            
            @keyframes scFadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        </style>

        <div class="sc-container">
            <div class="sc-card">
                <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 2rem;">🌾</span>
                    <h3 style="margin: 0; color: #1a3a52; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">Farmer Subsidy Calculator</h3>
                </div>
                <p style="color: #5a6c7d; font-size: 0.95rem; margin-top: 0.3rem; font-weight: 500;">Estimate your agricultural benefits</p>

                <form id="sc-form" style="margin-top: 2rem;">
                    <div class="sc-section-label"><p>📜 Land & Farmer Details</p></div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem;">
                        <div>
                            <label class="sc-label">Land Size (Acres) <span style="color:#e74c3c;">*</span></label>
                            <input type="number" id="sc-land-size" class="sc-input" placeholder="e.g., 2.5" step="0.01" min="0" required>
                        </div>
                        <div>
                            <label class="sc-label">Farmer Category <span style="color:#e74c3c;">*</span></label>
                            <select id="sc-category" class="sc-select" required>
                                <option value="" disabled selected>Select Category</option>
                                <option value="General">General</option>
                                <option value="BC">BC</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="Woman">Woman</option>
                            </select>
                        </div>
                    </div>

                    <div class="sc-section-label"><p>🚜 Equipment & Support</p></div>
                    <div class="sc-checkbox-group">
                        <label class="sc-checkbox-item">
                            <input type="checkbox" name="sc-equip" value="Drip Irrigation">
                            <label>Drip Irrigation</label>
                        </label>
                        <label class="sc-checkbox-item">
                            <input type="checkbox" name="sc-equip" value="Tractor">
                            <label>Tractor</label>
                        </label>
                        <label class="sc-checkbox-item">
                            <input type="checkbox" name="sc-equip" value="Solar Pump">
                            <label>Solar Pump</label>
                        </label>
                        <label class="sc-checkbox-item">
                            <input type="checkbox" id="sc-livestock">
                            <label>Livestock Support</label>
                        </label>
                    </div>

                    <button type="submit" class="sc-submit">Calculate Total Benefit</button>
                </form>
            </div>

            <div id="sc-result-container" style="display: none;"></div>
        </div>
        `;
    };

    // ── Initialization and Logic ──
    window.initSubsidyCalculator = function () {
        const form = document.getElementById('sc-form');
        const results = document.getElementById('sc-result-container');

        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const acres = parseFloat(document.getElementById('sc-land-size').value) || 0;
            const category = document.getElementById('sc-category').value;
            const selectedEquip = Array.from(document.querySelectorAll('input[name="sc-equip"]:checked')).map(el => el.value);
            const livestock = document.getElementById('sc-livestock').checked;

            let breakdownHtml = '';
            let totalBenefit = 0;

            // 1. Direct Income Support
            const rythuBharosaAmt = acres * 12000;
            const pmKisanAmt = 6000;
            totalBenefit += rythuBharosaAmt + pmKisanAmt;

            breakdownHtml += `
                <div class="sc-item">
                    <div>
                        <span>Rythu Bharosa</span>
                        <span class="sc-formula">Land size (${acres} acres) × ₹12,000 / acre</span>
                    </div>
                    <span style="color: #22863a; font-weight: 700;">${formatCurrency(rythuBharosaAmt)}</span>
                </div>
                <div class="sc-item">
                    <div>
                        <span>PM-KISAN</span>
                        <span class="sc-formula">Fixed annual support for landholding farmers</span>
                    </div>
                    <span style="color: #22863a; font-weight: 700;">${formatCurrency(pmKisanAmt)}</span>
                </div>
            `;

            // 2. Equipment Subsidies
            selectedEquip.forEach(equip => {
                let subsidy = 0;
                let pct = 0;
                let base = 0;

                if (equip === 'Drip Irrigation') {
                    base = 140000;
                    if (category === 'SC' || category === 'ST') pct = 100;
                    else if (category === 'BC') pct = 90;
                    else pct = 80;
                } else if (equip === 'Tractor') {
                    base = 800000;
                    if (category === 'SC' || category === 'ST' || category === 'Woman') pct = 80;
                    else pct = 50;
                } else if (equip === 'Solar Pump') {
                    base = 200000;
                    if (category === 'SC' || category === 'ST') pct = 90;
                    else pct = 60;
                }

                subsidy = (base * pct) / 100;
                totalBenefit += subsidy;

                breakdownHtml += `
                    <div class="sc-item">
                        <div>
                            <span>${equip} Subsidy</span>
                            <span class="sc-formula">${pct}% of ₹${(base / 100000).toFixed(1)}L base cost (${category} category)</span>
                        </div>
                        <span style="color: #22863a; font-weight: 700;">${formatCurrency(subsidy)}</span>
                    </div>
                `;
            });

            // 3. Livestock Subsidy
            if (livestock) {
                const livestockAmt = 150000 * 0.75;
                totalBenefit += livestockAmt;
                breakdownHtml += `
                    <div class="sc-item">
                        <div>
                            <span>Livestock Support</span>
                            <span class="sc-formula">75% subsidy on ₹1,50,000 unit cost</span>
                        </div>
                        <span style="color: #22863a; font-weight: 700;">${formatCurrency(livestockAmt)}</span>
                    </div>
                `;
            }

            // 4. Electricity Cost (Decorative/Zero)
            breakdownHtml += `
                <div class="sc-item" style="border-bottom: 2px solid #22863a; padding-bottom: 1rem; margin-bottom: 1rem;">
                    <div>
                        <span>Electricity Cost</span>
                        <span class="sc-formula">Free electricity for agricultural connections</span>
                    </div>
                    <span style="color: #22863a; font-weight: 700;">₹0 (100% Subsidy)</span>
                </div>
            `;

            // Render Result
            results.innerHTML = `
                <div class="sc-result-card">
                    <h4 style="margin: 0; color: #22863a; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; gap: 0.6rem;">
                        <span>📈</span> Calculation Breakdown
                    </h4>
                    
                    <div style="margin: 1.5rem 0;">
                        ${breakdownHtml}
                    </div>

                    <div style="text-align: center;">
                        <span style="font-size: 0.9rem; color: #5a6c7d; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Total Estimated Benefit</span>
                        <div class="sc-amount">${formatCurrency(totalBenefit)}</div>
                    </div>
                </div>
            `;
            results.style.display = 'block';

            // Scroll to result
            setTimeout(() => {
                results.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        });
    };

})();
