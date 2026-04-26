document.addEventListener('DOMContentLoaded', () => {
    // Global error handler
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        console.error('Global Error:', { msg, url, lineNo, columnNo, error });
        return false;
    };

    // --- Configuration & State ---
    // --- Configuration & State ---
    // --- Configuration & State ---
    const API_BASE_URL = 'https://prajavaani-api-production.up.railway.app';
    const STATE = {
        currentUser: null,
        currentView: 'login-view',
        currentTab: 'overview',
        selectedSchemeId: null,
        eligibilityResults: []
    };

    // Load full schemes dataset for details (in background, non-blocking)
    let schemes_dataset = [];
    fetch('/schemes_dataset.json')
        .then(response => response.json())
        .then(data => {
            schemes_dataset = data;
            console.log('Loaded schemes dataset:', schemes_dataset.length, 'schemes');
        })
        .catch(error => console.warn('Could not load schemes_dataset.json:', error));

    // --- DOM Elements ---
    const views = {
        login: document.getElementById('login-view'),
        register: document.getElementById('register-view'),
        dashboard: document.getElementById('dashboard-view')
    };

    const forms = {
        login: document.getElementById('login-form'),
        register: document.getElementById('register-form')
    };

    const links = {
        showRegister: document.getElementById('show-register'),
        showLogin: document.getElementById('show-login'),
        logout: document.getElementById('logout-btn')
    };

    const dashboard = {
        navItems: document.querySelectorAll('.nav-item'),
        contentArea: document.getElementById('tab-content'),
        pageTitle: document.getElementById('page-title'),
        displayName: document.getElementById('display-name')
    };

    // --- Mock Data ---
    const SCHEMES = [];

    // --- Utilities ---

    function hashPassword(message) {
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    function showView(viewName) {
        Object.values(views).forEach(el => el.classList.remove('active'));
        if (views[viewName]) {
            views[viewName].classList.add('active');
            STATE.currentView = viewName;
        }
    }

    function showToast(message) {
        alert(message); // Using alert for simplicity for now, could be improved
    }

    // --- Authentication Logic ---

    async function handleRegister(e) {
        e.preventDefault();
        console.log('Register handler called');

        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;

        if (!name || !email || !password) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registration Successful! Please Sign In.');
                document.getElementById('register-form').reset();
                showView('login');
            } else {
                alert(data.error ? "Registration failed. Reason: " + data.error : ("Registration failed with status " + response.status));
            }
        } catch (error) {
            console.error('Register error:', error);
            alert('Error during registration: ' + error.message);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                STATE.currentUser = data.user;
                loadDashboard();
                showView('dashboard');
            } else {
                showToast(data.error || "Invalid credentials!");
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast("Error during login.");
        }
    }



    function handleLogout() {
        STATE.currentUser = null;
        STATE.currentTab = 'overview';
        STATE.selectedSchemeId = null;
        showView('login');
    }

    // Attach View Navigation Event Listeners
    if (links.showRegister) {
        links.showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            showView('register');
        });
    }

    if (links.showLogin) {
        links.showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showView('login');
        });
    }

    if (links.logout) {
        links.logout.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // Export to window for html onclick declarations
    window.handleRegisterClick = handleRegister;
    window.handleLoginClick = handleLogin;

    // --- Dashboard Logic ---

    function loadDashboard() {
        dashboard.displayName.textContent = STATE.currentUser.name;
        renderTab(STATE.currentTab);
    }

    function switchTab(tabName) {
        STATE.currentTab = tabName;
        STATE.selectedSchemeId = null; // Reset selection when switching main tabs

        // Update Sidebar UI
        dashboard.navItems.forEach(item => {
            if (item.dataset.tab === tabName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        renderTab(tabName);
    }

    function renderTab(tabName) {
        let content = '';
        let title = '';

        if (tabName === 'overview') {
            title = 'Home';
            content = renderOverviewTab();
        } else if (tabName === 'schemes') {
            if (STATE.selectedSchemeId) {
                // Try to find scheme from eligibility results first (includes confidence)
                let schemeData = STATE.eligibilityResults?.find(s => s.id === STATE.selectedSchemeId);

                // Merge with full scheme data from dataset if available
                if (schemeData) {
                    const fullSchemeData = schemes_dataset?.find(s => s.id === STATE.selectedSchemeId);
                    if (fullSchemeData) {
                        schemeData = { ...schemeData, ...fullSchemeData };
                    }
                } else {
                    // Fallback to mock SCHEMES array
                    schemeData = SCHEMES.find(s => s.id === STATE.selectedSchemeId);
                }
                title = schemeData ? schemeData.title : 'Scheme Details';
                content = renderSchemeDetails(schemeData);
            } else {
                title = 'Eligibility Checker';
                content = renderSchemesList();
            }
        } else if (tabName === 'ai-assistant') {
            title = 'PrajaVaani Bot';
            content = renderAiAssistantTab();
        } else if (tabName === 'fake-scheme') {
            title = 'Fake Scheme Detector';
            content = renderFakeSchemeTab();
        } else if (tabName === 'fee-reimbursement') {
            title = 'Fee Reimbursement Estimator';
            content = renderFeeReimbursementTab();
        } else if (tabName === 'subsidy-calculator') {
            title = 'Farmer Subsidy Calculator';
            content = window.renderSubsidyCalculatorTab ? window.renderSubsidyCalculatorTab() : renderPlaceholderTab('💰', 'Subsidy Calculator', 'Loading calculator module...');
        } else if (tabName === 'nearest-help') {
            title = 'Nearest Help Centre';
            content = window.renderNearestHelpTab ? window.renderNearestHelpTab() : renderPlaceholderTab('📍', 'Nearest Help Centre', 'Loading nearest help module...');
        }

        // Common DOM Update
        dashboard.pageTitle.textContent = title;
        dashboard.contentArea.innerHTML = content;

        // Post-render hooks
        if (tabName === 'schemes') {
            attachSchemeListeners();
        } else if (tabName === 'ai-assistant') {
            initVoiceAssistant();
        } else if (tabName === 'fake-scheme') {
            initFakeSchemeDetector();
        } else if (tabName === 'fee-reimbursement') {
            initFeeReimbursementEstimator();
        } else if (tabName === 'subsidy-calculator') {
            if (window.initSubsidyCalculator) window.initSubsidyCalculator();
        } else if (tabName === 'nearest-help') {
            if (window.initNearestHelpCenter) window.initNearestHelpCenter();
        }

        function renderOverviewTab() {
            return `
            <style>
                .overview-features-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                    margin-top: 1rem;
                }
                
                .overview-feature-card {
                    background: #ffffff;
                    border: 1px solid #e8f0ff;
                    border-radius: 12px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    display: flex;
                    flex-direction: column;
                }
                
                .overview-feature-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.04);
                }
                
                .overview-feature-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                
                .overview-feature-icon {
                    font-size: 1.8rem;
                    margin-right: 0.8rem;
                    background: #e1f5fe;
                    width: 45px;
                    height: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    color: #4a90e2;
                }
                
                .overview-feature-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1a3a52;
                    margin: 0;
                }
                
                .overview-feature-desc {
                    color: #5a6c7d;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    margin: 0;
                    font-weight: 500;
                }
                
                @media (max-width: 1024px) {
                    .overview-features-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                
                @media (max-width: 768px) {
                    .overview-features-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                .home-hero {
                    text-align: center;
                    padding: 2.5rem 1rem 3.5rem;
                    background: var(--glass-bg);
                    backdrop-filter: var(--backdrop-blur);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    margin-bottom: 2.5rem;
                    box-shadow: var(--glass-shadow);
                }
                
                .home-title {
                    font-size: 3rem;
                    font-weight: 800;
                    color: var(--primary-color);
                    margin-bottom: 1rem;
                    letter-spacing: -0.5px;
                }
                
                .home-description {
                    font-size: 1.15rem;
                    color: var(--text-muted);
                    max-width: 700px;
                    margin: 0 auto;
                    line-height: 1.6;
                    font-weight: 500;
                }
            </style>
            
            <div class="home-hero">
                <h1 class="home-title">PrajaVaani</h1>
                <p class="home-description">Your smart companion for government schemes — bringing clarity, trust, and instant guidance to every citizen.</p>
            </div>
            
            <div class="overview-features-grid">
                <!-- Feature 1 -->
                <div class="overview-feature-card">
                    <div class="overview-feature-header">
                        <div class="overview-feature-icon">🎯</div>
                        <h3 class="overview-feature-title">Eligibility Checker</h3>
                    </div>
                    <p class="overview-feature-desc">
                        Helps citizens check whether they qualify for specific government schemes based on age, income, caste, occupation, and other criteria. Provides instant eligibility results.
                    </p>
                </div>
                
                <!-- Feature 2 -->
                <div class="overview-feature-card">
                    <div class="overview-feature-header">
                        <div class="overview-feature-icon">🤖</div>
                        <h3 class="overview-feature-title">PrajaVaani Bot</h3>
                    </div>
                    <p class="overview-feature-desc">
                        An AI-powered voice assistant that supports Telugu and English. Users can ask questions through voice or text and get scheme information instantly.
                    </p>
                </div>
                
                <!-- Feature 4 -->
                <div class="overview-feature-card">
                    <div class="overview-feature-header">
                        <div class="overview-feature-icon">🛡️</div>
                        <h3 class="overview-feature-title">Fake Scheme Detector</h3>
                    </div>
                    <p class="overview-feature-desc">
                        Protects citizens from online scams and fake government schemes by verifying URLs and identifying fraudulent claims.
                    </p>
                </div>
                
                <!-- Feature 5 -->
                <div class="overview-feature-card">
                    <div class="overview-feature-header">
                        <div class="overview-feature-icon">📍</div>
                        <h3 class="overview-feature-title">Nearest Help Centre</h3>
                    </div>
                    <p class="overview-feature-desc">
                        Instantly locates your nearest MeeSeva centre or department office for physical assistance.
                    </p>
                </div>
                
                <!-- Feature 6 -->
                <div class="overview-feature-card">
                    <div class="overview-feature-header">
                        <div class="overview-feature-icon">💰</div>
                        <h3 class="overview-feature-title">Subsidy Calculator</h3>
                    </div>
                    <p class="overview-feature-desc">
                        Calculates exact financial benefits for farmer subsidies, and loan subsidies.
                    </p>
                </div>
                
                <!-- Feature 7 -->
                <div class="overview-feature-card">
                    <div class="overview-feature-header">
                        <div class="overview-feature-icon">🎓</div>
                        <h3 class="overview-feature-title">Fee Reimbursement Estimator</h3>
                    </div>
                    <p class="overview-feature-desc">
                        Estimate your Telangana scholarship fee reimbursement based on education level, category, and income. Covers Pre-Matric to Degree/Professional courses.
                    </p>
                </div>
            </div>
        `;
        }

        function renderSchemesList() {
            // Just mocking the list
            return `
            <div class="eligibility-checker-container">
                <div class="checker-form-card" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%); border: 2px solid #e8f0ff; border-radius: 12px; padding: 2rem;">
                    <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.5rem;">
                        <span style="font-size: 1.8rem;">🎯</span>
                        <h3 style="margin: 0; color: #1a3a52; font-size: 1.5rem; font-weight: 700;">Check Your Eligibility</h3>
                    </div>
                    <p style="color: #5a6c7d; font-size: 0.95rem; margin-top: 0.3rem; font-weight: 500;">📍 Available for: Telangana | Fill in your details to find schemes you're eligible for</p>
                    
                    <form id="eligibility-form" style="display: grid; gap: 1.2rem; margin-top: 2rem;">
                        <!-- PERSONAL INFORMATION -->
                        <div style="background: #e1f5fe; border-left: 4px solid #4a90e2; border-radius: 8px; padding: 1rem; margin-bottom: 0.5rem;">
                            <p style="margin: 0; font-size: 0.9rem; font-weight: 700; color: #1a3a52;">👤 Personal Information</p>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem;">
                            <div class="input-group">
                                <label style="font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem;">Age <span style="color: #e74c3c;">*</span></label>
                                <input type="number" id="check-age" placeholder="e.g., 25" min="1" max="120" style="width: 100%; padding: 0.9rem 1rem; border: 2px solid #d4e4f7; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1a3a52; background: #ffffff; transition: all 0.3s ease;" onFocus="this.style.borderColor='#4a90e2'; this.style.boxShadow='0 0 0 3px rgba(74,144,226,0.1)'" onBlur="this.style.borderColor='#d4e4f7'; this.style.boxShadow='none'">
                            </div>
                            <div class="input-group">
                                <label style="font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem;">Gender</label>
                                <select id="check-gender" style="width: 100%; padding: 0.9rem 1rem; border: 2px solid #d4e4f7; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1a3a52; background: #ffffff; cursor: pointer; transition: all 0.3s ease;" onFocus="this.style.borderColor='#4a90e2'; this.style.boxShadow='0 0 0 3px rgba(74,144,226,0.1)'" onBlur="this.style.borderColor='#d4e4f7'; this.style.boxShadow='none'">
                                    <option value="">Select Gender...</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem;">
                            <div class="input-group">
                                <label style="font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem;">Caste/Category</label>
                                <select id="check-caste" style="width: 100%; padding: 0.9rem 1rem; border: 2px solid #d4e4f7; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1a3a52; background: #ffffff; cursor: pointer; transition: all 0.3s ease;" onFocus="this.style.borderColor='#4a90e2'; this.style.boxShadow='0 0 0 3px rgba(74,144,226,0.1)'" onBlur="this.style.borderColor='#d4e4f7'; this.style.boxShadow='none'">
                                    <option value="">Select Category...</option>
                                    <option value="SC">SC (Scheduled Caste)</option>
                                    <option value="ST">ST (Scheduled Tribe)</option>
                                    <option value="BC">BC (Backward Caste)</option>
                                    <option value="EBC">EBC (Extremely Backward Caste)</option>
                                    <option value="OBC">OBC</option>
                                    <option value="Minority">Minority</option>
                                    <option value="General">General</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label style="font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem;">Occupation</label>
                                <select id="check-occupation" style="width: 100%; padding: 0.9rem 1rem; border: 2px solid #d4e4f7; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1a3a52; background: #ffffff; cursor: pointer; transition: all 0.3s ease;" onFocus="this.style.borderColor='#4a90e2'; this.style.boxShadow='0 0 0 3px rgba(74,144,226,0.1)'" onBlur="this.style.borderColor='#d4e4f7'; this.style.boxShadow='none'">
                                    <option value="">Select Occupation...</option>
                                    <option value="farmer">Farmer</option>
                                    <option value="student">Student</option>
                                    <option value="weaver">Weaver</option>
                                    <option value="fisherman">Fisherman</option>
                                    <option value="artisan">Artisan</option>
                                    <option value="govt_employee">Government Employee</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <!-- ECONOMIC INFORMATION -->
                        <div style="background: #e1f5fe; border-left: 4px solid #4a90e2; border-radius: 8px; padding: 1rem; margin: 1rem 0 0.5rem 0;">
                            <p style="margin: 0; font-size: 0.9rem; font-weight: 700; color: #1a3a52;">💰 Economic Information</p>
                        </div>
                        <div class="input-group">
                            <label style="font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem;">Annual Income (₹)</label>
                            <input type="number" id="check-income" placeholder="e.g., 200000" min="0" style="width: 100%; padding: 0.9rem 1rem; border: 2px solid #d4e4f7; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1a3a52; background: #ffffff; transition: all 0.3s ease;" onFocus="this.style.borderColor='#4a90e2'; this.style.boxShadow='0 0 0 3px rgba(74,144,226,0.1)'" onBlur="this.style.borderColor='#d4e4f7'; this.style.boxShadow='none'">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem;">
                            <div class="input-group">
                                <label style="font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem;">Ration Card Type</label>
                                <select id="check-ration-card" style="width: 100%; padding: 0.9rem 1rem; border: 2px solid #d4e4f7; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1a3a52; background: #ffffff; cursor: pointer; transition: all 0.3s ease;" onFocus="this.style.borderColor='#4a90e2'; this.style.boxShadow='0 0 0 3px rgba(74,144,226,0.1)'" onBlur="this.style.borderColor='#d4e4f7'; this.style.boxShadow='none'">
                                    <option value="">None</option>
                                    <option value="White">White</option>
                                    <option value="Yellow">Yellow</option>
                                    <option value="Red">Red</option>
                                    <option value="Pink">Pink</option>
                                </select>
                            </div>
                            <div class="input-group">
                                <label style="font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem;">Income Status</label>
                                <select id="check-income-status" style="width: 100%; padding: 0.9rem 1rem; border: 2px solid #d4e4f7; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1a3a52; background: #ffffff; cursor: pointer; transition: all 0.3s ease;" onFocus="this.style.borderColor='#4a90e2'; this.style.boxShadow='0 0 0 3px rgba(74,144,226,0.1)'" onBlur="this.style.borderColor='#d4e4f7'; this.style.boxShadow='none'">
                                    <option value="">Select...</option>
                                    <option value="BPL">BPL (Below Poverty Line)</option>
                                    <option value="APL">APL (Above Poverty Line)</option>
                                </select>
                            </div>
                        </div>

                        <!-- AGRICULTURE & LAND -->
                        <div style="background: #e1f5fe; border-left: 4px solid #4a90e2; border-radius: 8px; padding: 1rem; margin: 1rem 0 0.5rem 0;">
                            <p style="margin: 0; font-size: 0.9rem; font-weight: 700; color: #1a3a52;">🌾 Agriculture & Land</p>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem;">
                            <div class="input-group">
                                <label style="font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem;">Land Size (acres)</label>
                                <input type="number" id="check-land-size" placeholder="e.g., 2.5" min="0" step="0.1" style="width: 100%; padding: 0.9rem 1rem; border: 2px solid #d4e4f7; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1a3a52; background: #ffffff; transition: all 0.3s ease;" onFocus="this.style.borderColor='#4a90e2'; this.style.boxShadow='0 0 0 3px rgba(74,144,226,0.1)'" onBlur="this.style.borderColor='#d4e4f7'; this.style.boxShadow='none'">
                            </div>
                            <div class="input-group">
                                <label style="font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem;">Electricity Units/Month</label>
                                <input type="number" id="check-units-consumed" placeholder="e.g., 200" min="0" style="width: 100%; padding: 0.9rem 1rem; border: 2px solid #d4e4f7; border-radius: 8px; font-size: 0.95rem; font-weight: 500; color: #1a3a52; background: #ffffff; transition: all 0.3s ease;" onFocus="this.style.borderColor='#4a90e2'; this.style.boxShadow='0 0 0 3px rgba(74,144,226,0.1)'" onBlur="this.style.borderColor='#d4e4f7'; this.style.boxShadow='none'">
                            </div>
                        </div>

                        <!-- STATUS & CHECKBOXES -->
                        <div style="background: #e1f5fe; border-left: 4px solid #4a90e2; border-radius: 8px; padding: 1rem; margin: 1rem 0 0.5rem 0;">
                            <p style="margin: 0; font-size: 0.9rem; font-weight: 700; color: #1a3a52;">✓ Your Status</p>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-farmer" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🌾 Farmer</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-tenant-farmer" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🚜 Tenant Farmer</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-land-owner" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🏘️ Land Owner</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-student" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>📚 Student</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-unemployed" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>💼 Unemployed</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-bpl" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>📋 BPL Status</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-taxpayer" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🏛️ Taxpayer</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-govt-employee" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>👔 Govt Employee</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-homeless" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🏠 Homeless</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-mother" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>👩‍👧 Mother</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-weaver" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🧶 Weaver</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-fisherman" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🐟 Fisherman</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-artisan" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🎨 Artisan</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-shg-member" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>👥 SHG Member</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-lpg-owner" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🔥 Has LPG</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-house-owner" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>🏠 House Owner</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #1a3a52;">
                                <input type="checkbox" id="check-senior-citizen" style="width: 1.1rem; height: 1.1rem; margin-right: 0.6rem; cursor: pointer; accent-color: #4a90e2;">
                                <span>👴 Senior Citizen (70+)</span>
                            </label>
                        </div>

                        <button type="submit" class="btn-primary" id="check-btn" style="margin-top: 2rem; width: 100%; font-weight: 700; font-size: 1rem; padding: 1rem; background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); color: #ffffff; border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(74,144,226,0.3);">
                            ✓ Check Eligibility
                        </button>
                    </form>
                </div>

                <div id="eligibility-results" style="margin-top: 2rem; display: none;">
                    <!-- Results will be inserted here -->
                </div>

                <div class="schemes-grid" id="schemes-grid" style="margin-top: 2rem;">
                    ${SCHEMES.map(scheme => `
                        <div class="scheme-card" data-id="${scheme.id}">
                            <div class="scheme-badge">${scheme.badge}</div>
                            <h3 class="scheme-title">${scheme.title}</h3>
                            <p class="scheme-desc">${scheme.description}</p>
                            <button class="btn-primary" style="margin-top: auto; font-size: 0.8rem; padding: 0.75rem;">View Details</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        }

        function renderSchemeDetails(scheme) {
            if (!scheme) return `<p>Scheme not found.</p>`;

            const isEligible = scheme.eligible === true || (scheme.confidence && scheme.confidence >= 0.6);
            const statusClass = isEligible ? '' : 'not-eligible';
            const statusText = isEligible ? "✅ You're Eligible!" : "❌ Not Eligible";
            const statusDesc = isEligible
                ? "Based on your profile, you meet the criteria for this scheme. Proceed with your application."
                : "Based on your profile, you do NOT meet the criteria for this scheme. Check missing requirements below.";

            const confidencePercent = scheme.confidence ? Math.round(scheme.confidence * 100) : 0;
            const confidenceColor = confidencePercent >= 80 ? '#22863a' : confidencePercent >= 60 ? '#f39c12' : '#da3633';

            const iconPath = isEligible
                ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z";

            // Extract eligibility criteria text from criteria object or array
            let criteriaText = [];
            if (scheme.criteria) {
                if (Array.isArray(scheme.criteria)) {
                    criteriaText = scheme.criteria;
                } else if (typeof scheme.criteria === 'object') {
                    Object.entries(scheme.criteria).forEach(([key, value]) => {
                        if (value === true) {
                            criteriaText.push(`✓ ${key.replace(/_/g, ' ').toUpperCase()}`);
                        } else if (value === false) {
                            criteriaText.push(`✗ Must NOT be ${key.replace(/_/g, ' ')}`);
                        } else if (typeof value === 'number') {
                            criteriaText.push(`✓ ${key.replace(/_/g, ' ')}: ${value}`);
                        } else if (typeof value === 'string') {
                            criteriaText.push(`✓ ${key.replace(/_/g, ' ')}: ${value}`);
                        } else if (Array.isArray(value)) {
                            criteriaText.push(`✓ ${key.replace(/_/g, ' ')}: ${value.join(', ')}`);
                        }
                    });
                }
            }

            // Ensure we have scheme data from API response
            const schemeDetails = scheme.documents || scheme.required_documents;
            const schemeBenefits = scheme.benefits || 'No benefit details available';
            const schemeDescription = scheme.description || 'No description available';

            // Render detailed view
            return `
            <div class="scheme-detail-view">
                <button class="back-link" id="back-to-schemes" style="background: none; border: none; color: #4a90e2; cursor: pointer; font-size: 0.95rem; font-weight: 600; padding: 0; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease;" onMouseOver="this.style.color='#357abd'" onMouseOut="this.style.color='#4a90e2'">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Eligibility Results
                </button>

                <div class="detail-layout" style="display: grid; grid-template-columns: 1fr 350px; gap: 2rem; margin-top: 1.5rem;">
                    <!-- Left Column - Comprehensive Details -->
                    <div class="detail-content" style="background: #b3e5fc; padding: 2rem; border-radius: 12px; border: 1px solid #e8f0ff; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div class="detail-header" style="border-bottom: 2px solid #e8f0ff; padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
                            <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem;">
                                <div>
                                    <span style="background: ${confidenceColor}; color: #ffffff; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.85rem; font-weight: 700; display: inline-block; margin-bottom: 0.5rem;">${scheme.category || 'Government Scheme'}</span>
                                    <h2 style="color: #1a3a52; font-size: 1.8rem; font-weight: 700; margin: 0.5rem 0;">${scheme.title}</h2>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.2rem; color: #5a6c7d; font-weight: 500;">🏢 ${scheme.government || 'Government'}</div>
                                </div>
                            </div>
                            <p style="color: #5a6c7d; font-size: 1rem; line-height: 1.6; margin: 1rem 0 0 0;">${scheme.description || 'No description available'}</p>
                        </div>

                        <div style="margin-bottom: 2rem;">
                            <h3 style="color: #1a3a52; font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;">
                                <span>💰</span> Benefits & Financial Assistance
                            </h3>
                            <div style="background: linear-gradient(135deg, #e1f5fe 0%, #e8f4ff 100%); border: 2px solid #4a90e2; border-radius: 8px; padding: 1.2rem; color: #1a3a52; font-size: 1.05rem; font-weight: 600; line-height: 1.6;">
                                ${schemeBenefits}
                            </div>
                        </div>

                        <div style="margin-bottom: 2rem;">
                            <h3 style="color: #1a3a52; font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;">
                                <span>✓</span> Eligibility Criteria
                            </h3>
                            <div style="background: #f9f9f9; border-left: 5px solid #4a90e2; border-radius: 4px; padding: 1.2rem;">
                                ${criteriaText.length > 0 ? `
                                    <ul style="margin: 0; padding-left: 1.5rem; list-style: disc;">
                                        ${criteriaText.map(c => `
                                            <li style="color: #1a3a52; font-weight: 500; margin: 0.6rem 0; line-height: 1.6;">${c}</li>
                                        `).join('')}
                                    </ul>
                                ` : '<p style="color: #5a6c7d;">No criteria specified</p>'}
                            </div>
                        </div>

                        <div style="margin-bottom: 2rem;">
                            <h3 style="color: #1a3a52; font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;">
                                <span>📄</span> Required Documents
                            </h3>
                            <div style="background: #f9f9f9; border-radius: 8px; padding: 1.2rem;">
                                ${(schemeDetails || []).length > 0 ? `
                                    <ul style="margin: 0; padding-left: 1.5rem; list-style: none;">
                                        ${(schemeDetails || []).map(d => `
                                            <li style="display: flex; align-items: center; gap: 0.8rem; padding: 0.6rem 0; color: #1a3a52; font-weight: 500; border-bottom: 1px solid #e8f0ff;">
                                                <span style="color: #4a90e2; font-weight: 700;">📋</span>
                                                ${d}
                                            </li>
                                        `).join('')}
                                    </ul>
                                ` : '<p style="color: #5a6c7d;">No documents specified</p>'}
                            </div>
                        </div>

                        ${scheme.missing_criteria && scheme.missing_criteria.length > 0 ? `
                            <div style="margin-bottom: 2rem;">
                                <h3 style="color: #da3633; font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;">
                                    <span>⚠️</span> Missing Requirements
                                </h3>
                                <div style="background: #fef5f5; border: 2px solid #ffc4c2; border-radius: 8px; padding: 1.2rem;">
                                    <ul style="margin: 0; padding-left: 1.5rem; list-style: disc;">
                                        ${scheme.missing_criteria.map(m => `
                                            <li style="color: #1a3a52; font-weight: 600; margin: 0.6rem 0; line-height: 1.6;">${m}</li>
                                        `).join('')}
                                    </ul>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Right Column - Eligibility Card -->
                    <div class="detail-sidebar" style="position: sticky; top: 20px; height: fit-content;">
                        <div style="background: linear-gradient(135deg, ${isEligible ? '#f5fff7' : '#fff5f5'} 0%, ${isEligible ? '#e8f9ee' : '#ffe8e8'} 100%); border: 2px solid ${isEligible ? '#22863a' : '#da3633'}; border-radius: 12px; padding: 1.5rem; text-align: center;">
                            <div style="margin-bottom: 1rem;">
                                <svg style="width: 48px; height: 48px; color: ${isEligible ? '#22863a' : '#da3633'};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}" />
                                </svg>
                            </div>
                            <h3 style="color: ${isEligible ? '#22863a' : '#da3633'}; font-size: 1.3rem; font-weight: 700; margin: 0.5rem 0;">${statusText}</h3>
                            <p style="color: #5a6c7d; font-size: 0.9rem; margin: 0.5rem 0; line-height: 1.5;">${statusDesc}</p>
                            
                            <div style="margin: 1.5rem 0; padding: 1rem; background: white; border-radius: 8px;">
                                <div style="font-size: 0.8rem; color: #5a6c7d; font-weight: 600; margin-bottom: 0.3rem;">Match Score</div>
                                <div style="font-size: 2.5rem; font-weight: 700; color: ${confidenceColor}; margin-bottom: 0.5rem;">${confidencePercent}%</div>
                                <div style="background: #e8f0ff; border-radius: 8px; height: 10px; overflow: hidden;">
                                    <div style="background: linear-gradient(90deg, ${confidenceColor}, ${confidenceColor}); height: 100%; width: ${confidencePercent}%;"></div>
                                </div>
                                <p style="margin: 0.8rem 0 0 0; font-size: 0.85rem; color: #5a6c7d; font-weight: 500;">
                                    ${confidencePercent >= 80 ? '✓ Excellent fit' : confidencePercent >= 60 ? '◐ Good fit' : '○ Partial fit'}
                                </p>
                            </div>

                            <button style="width: 100%; padding: 1rem; margin-top: 1rem; background: ${isEligible ? '#22863a' : '#da3633'}; color: #ffffff; border: none; border-radius: 6px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" onMouseOver="this.style.transform='scale(1.02)'" onMouseOut="this.style.transform='scale(1)'" onclick="${scheme.apply_url ? `window.open('${scheme.apply_url}', '_blank')` : "alert('Official Application Portal for this scheme is coming soon! Please check back later.')"}">
                                ${isEligible ? '📝 Apply Now' : '📋 Learn More'}
                            </button>

                        </div>

                    </div>
                </div>
            </div>
            `;
        }

        function attachSchemeListeners() {
            const backBtn = document.getElementById('back-to-schemes');
            if (backBtn) {
                backBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    STATE.selectedSchemeId = null;

                    if (STATE.eligibilityResults && STATE.eligibilityResults.length > 0) {
                        // Re-render the tab, but tell it we're coming from the results so the form stays hidden/collapsed 
                        // Actually, we can just re-render the whole tab and then instantly re-display the results via state
                        renderTab('schemes');

                        // Fake a successful data response to re-render the results html instantly into the new tab
                        const data = {
                            success: true,
                            summary: {
                                eligible_count: STATE.eligibilityResults.filter(r => r.eligible || r.confidence >= 0.6).length,
                                ineligible_count: STATE.eligibilityResults.filter(r => !r.eligible && r.confidence < 0.6).length
                            },
                            results: {
                                eligible: STATE.eligibilityResults.filter(r => r.eligible || r.confidence >= 0.6),
                                ineligible: STATE.eligibilityResults.filter(r => !r.eligible && r.confidence < 0.6)
                            }
                        };
                        displayEligibilityResults(data);
                    } else {
                        renderTab('schemes');
                    }

                    // Force scroll to results
                    setTimeout(() => {
                        document.getElementById('eligibility-results')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                });
            }

            // Attach listeners to "View More Details" buttons in results
            const detailBtns = document.querySelectorAll('.view-more-details-btn');
            detailBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    STATE.selectedSchemeId = id;
                    renderTab('schemes'); // Re-renders showing details
                });
            });

            // Attach eligibility form listener
            attachEligibilityFormListener();
        }

        function attachEligibilityFormListener() {
            const eligibilityForm = document.getElementById('eligibility-form');
            if (!eligibilityForm) return;

            // Remove any existing listener to prevent duplicates
            const newForm = eligibilityForm.cloneNode(true);
            eligibilityForm.parentNode.replaceChild(newForm, eligibilityForm);

            const formElement = document.getElementById('eligibility-form');
            formElement.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Eligibility form submitted');

                // Validate required fields
                const age = document.getElementById('check-age').value.trim();

                if (!age) {
                    alert('Please fill in Age field');
                    return;
                }

                // Show loading state
                const checkBtn = document.getElementById('check-btn');
                const originalBtnText = checkBtn.textContent;
                checkBtn.textContent = '⏳ Checking...';
                checkBtn.disabled = true;

                try {
                    // Collect form data - all parameters
                    const userProfile = {
                        age: parseInt(age),
                        gender: document.getElementById('check-gender').value || undefined,
                        state: 'Telangana',  // Hardcoded to Telangana only
                        caste: document.getElementById('check-caste').value || undefined,
                        annual_income: parseInt(document.getElementById('check-income').value) || 0,
                        occupation: document.getElementById('check-occupation').value || undefined,
                        ration_card: document.getElementById('check-ration-card').value || undefined,
                        income_status: document.getElementById('check-income-status').value || undefined,
                        max_land_size_acres: parseFloat(document.getElementById('check-land-size').value) || 0,
                        units_consumed: parseInt(document.getElementById('check-units-consumed').value) || 0,

                        // Boolean flags
                        is_farmer: document.getElementById('check-farmer').checked,
                        is_tenant_farmer: document.getElementById('check-tenant-farmer').checked,
                        is_land_owner: document.getElementById('check-land-owner').checked,
                        is_student: document.getElementById('check-student').checked,
                        is_unemployed: document.getElementById('check-unemployed').checked,
                        is_bpl: document.getElementById('check-bpl').checked,
                        is_taxpayer: document.getElementById('check-taxpayer').checked,
                        is_govt_employee: document.getElementById('check-govt-employee').checked,
                        homeless: document.getElementById('check-homeless').checked,
                        is_mother: document.getElementById('check-mother').checked,
                        is_weaver: document.getElementById('check-weaver').checked,
                        is_fisherman: document.getElementById('check-fisherman').checked,
                        is_artisan: document.getElementById('check-artisan').checked,
                        is_shg_member: document.getElementById('check-shg-member').checked,
                        already_has_lpg: document.getElementById('check-lpg-owner').checked,
                        own_house: document.getElementById('check-house-owner').checked,
                        senior_citizen_above_70: document.getElementById('check-senior-citizen').checked
                    };

                    console.log('Sending user profile:', userProfile);

                    // Make API request
                    const response = await fetch('http://localhost:5000/api/check-eligibility', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(userProfile)
                    });

                    console.log('API Response status:', response.status);

                    if (!response.ok) {
                        throw new Error(`API error: ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log('API Response data:', data);

                    // Display results
                    displayEligibilityResults(data);

                    // Scroll to results
                    setTimeout(() => {
                        document.getElementById('eligibility-results').scrollIntoView({ behavior: 'smooth' });
                    }, 100);

                } catch (error) {
                    console.error('Eligibility check error:', error);
                    alert(`Error checking eligibility: ${error.message}\n\nMake sure the Express server is running on port 5000.\n\nTry running: npm run server`);
                } finally {
                    // Restore button state
                    const btn = document.getElementById('check-btn');
                    if (btn) {
                        btn.textContent = originalBtnText;
                        btn.disabled = false;
                    }
                }
            });
        }

        /* --- PRAJAVAANI BOT (VOICE & TEXT) --- */

        function renderAiAssistantTab() {
            return `
            <div class="ai-container">

                <!-- ── History Side Panel ── -->
                <div id="history-panel" class="history-panel">
                    <div class="history-panel-header">
                        <span>🕑 Recent Queries</span>
                        <button id="close-history-btn" class="close-history-btn" aria-label="Close history">✕</button>
                    </div>
                    <div id="history-list" class="history-list">
                        <div class="history-empty">No history yet. Start talking!</div>
                    </div>
                    <button id="clear-history-btn" class="clear-history-btn">🗑 Clear History</button>
                </div>

                <!-- ── Chat Window ── -->
                <div class="chat-window">
                    <div class="chat-header">
                        <div class="chat-header-left">
                            <div class="bot-avatar">🤖</div>
                            <div>
                                <div class="bot-name">PrajaVaani Bot</div>
                                <div class="bot-subtitle">Government Schemes Assistant · Telugu &amp; English</div>
                            </div>
                        </div>
                        <div class="chat-header-right">
                            <div class="lang-toggle-group" id="lang-toggle-group" title="Select conversation language">
                                <button class="lang-btn active" data-lang="en" id="lang-en">🇬🇧 English</button>
                                <button class="lang-btn" data-lang="te" id="lang-te">🇮🇳 తెలుగు</button>
                            </div>
                        </div>
                    </div>

                    <div class="chat-history" id="chat-history">
                        <div class="message ai">
                            <div class="msg-avatar">🤖</div>
                            <div class="msg-body">
                                <div class="msg-text">నమస్కారం! I am PrajaVaani. Ask me about government schemes in <strong>Telugu or English</strong> — like <em>Rythu Bharosa, PM-KISAN, Mahalakshmi, Ayushman Bharat</em> and more!</div>
                                <div class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Status / Lang Badge Row -->
                    <div class="status-row">
                        <span class="status-text" id="ai-status">🎙 Tap mic to speak or type below</span>
                        <span id="detected-lang-badge" class="lang-badge hidden"></span>
                    </div>

                    <!-- Input Controls -->
                    <div class="controls-row">
                        <div class="chat-input-area">
                            <input type="text" id="chat-input" class="chat-input"
                                placeholder="Ask about PM-KISAN, Rythu Bharosa, housing..." autocomplete="off">
                            <button class="send-btn" id="send-btn" aria-label="Send message">
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>

                        <div class="mic-btn-wrapper" id="mic-wrapper">
                            <div class="mic-ring"></div>
                            <div class="mic-ring mic-ring-2"></div>
                            <button class="mic-btn" id="mic-btn" aria-label="Start/Stop voice recording">
                                <svg class="icon-mic" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                                <svg class="icon-stop hidden" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="bottom-actions">
                        <button id="history-btn" class="action-pill-btn">
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2.5"/>
                            </svg>
                            History
                        </button>
                        <button id="clear-chat-btn" class="action-pill-btn">
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2.5"/>
                            </svg>
                            Clear Chat
                        </button>
                    </div>
                </div>
            </div>
        `;
        }

        function initVoiceAssistant() {
            const micBtn = document.getElementById('mic-btn');
            const micWrapper = document.getElementById('mic-wrapper');
            const statusText = document.getElementById('ai-status');
            const langBadge = document.getElementById('detected-lang-badge');
            const chatHistory = document.getElementById('chat-history');
            const chatInput = document.getElementById('chat-input');
            const sendBtn = document.getElementById('send-btn');
            const clearBtn = document.getElementById('clear-chat-btn');
            const historyBtn = document.getElementById('history-btn');
            const historyPanel = document.getElementById('history-panel');
            const closeHistoryBtn = document.getElementById('close-history-btn');
            const clearHistoryBtn = document.getElementById('clear-history-btn');

            if (!micBtn) return;

            // ── Web Speech API (Browser Recognition) ───────────────────────
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            let recognition = null;
            let isRecognitionActive = false;
            let manualLang = 'en'; // Defaults to English
            const BACKEND = 'http://127.0.0.1:8000'; // Using IP directly to avoid localhost resolution issues

            // ── Language toggle ────────────────────────────────────────────
            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    manualLang = btn.dataset.lang;
                    statusText.textContent = `Language set to: ${btn.textContent.trim()}`;
                    setTimeout(() => resetStatus(), 2000);
                });
            });

            // ── Sidebar History panel ─────────────────────────────────────
            if (historyBtn) {
                historyBtn.addEventListener('click', async () => {
                    historyPanel.classList.toggle('open');
                    if (historyPanel.classList.contains('open')) {
                        await loadHistory();
                    }
                });
            }
            if (closeHistoryBtn) {
                closeHistoryBtn.addEventListener('click', () => historyPanel.classList.remove('open'));
            }
            if (clearHistoryBtn) {
                clearHistoryBtn.addEventListener('click', async () => {
                    await fetch(`${BACKEND}/api/history`, { method: 'DELETE' });
                    document.getElementById('history-list').innerHTML = '<div class="history-empty">History cleared.</div>';
                });
            }

            async function loadHistory() {
                const list = document.getElementById('history-list');
                list.innerHTML = '<div class="history-empty">Loading…</div>';
                try {
                    const res = await fetch(`${BACKEND}/api/history`);
                    const data = await res.json();
                    const items = data.history || [];
                    if (!items.length) {
                        list.innerHTML = '<div class="history-empty">No history yet.</div>';
                        return;
                    }
                    list.innerHTML = items.map((item, i) => `
                        <div class="history-item" data-index="${i}">
                            <div class="history-item-lang">${item.detected_language === 'Telugu' ? 'TE' : 'EN'}</div>
                            <div class="history-item-text">${item.transcribed_text}</div>
                            <div class="history-item-meta">${formatTime(item.timestamp)}</div>
                        </div>
                    `).join('');

                    // Click to replay
                    list.querySelectorAll('.history-item').forEach((el, i) => {
                        el.addEventListener('click', () => {
                            const item = items[i];
                            historyPanel.classList.remove('open');
                            addUserMessage(item.transcribed_text, item.detected_language);
                            addAiMessage(item.english_reply, item.audio_url);
                        });
                    });
                } catch (e) {
                    list.innerHTML = '<div class="history-empty">Could not load history.</div>';
                }
            }

            function formatTime(isoString) {
                if (!isoString) return '';
                try {
                    return new Date(isoString).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                } catch { return ''; }
            }

            // ── Clear chat ────────────────────────────────────────────────
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    chatHistory.innerHTML = `
                        <div class="message ai">
                            <div class="msg-avatar">🤖</div>
                            <div class="msg-body">
                                <div class="msg-text">Chat cleared! How can I help you?</div>
                                <div class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>`;
                });
            }

            // ── Text submit ───────────────────────────────────────────────
            async function handleTextSubmit() {
                const text = chatInput.value.trim();
                if (!text) return;
                addUserMessage(text, manualLang === 'te' ? 'Telugu' : 'English');
                chatInput.value = '';
                await processTextQuery(text);
            }

            if (sendBtn) sendBtn.addEventListener('click', handleTextSubmit);
            if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleTextSubmit(); });

            if (SpeechRecognition) {
                recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;

                let finalTranscript = '';

                recognition.onstart = () => {
                    isRecognitionActive = true;
                    finalTranscript = '';
                    micWrapper.classList.add('recording');
                    micBtn.querySelector('.icon-mic').classList.add('hidden');
                    micBtn.querySelector('.icon-stop').classList.remove('hidden');
                    const langName = manualLang === 'te' ? 'Telugu' : 'English';
                    setStatus(`🔴 Listening (${langName})… Tap to stop.`, '#ff5252');
                    chatInput.value = ''; // Clear for live feedback
                };

                recognition.onresult = (event) => {
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    // Show live feedback in the input box
                    chatInput.value = finalTranscript + interimTranscript;
                };

                recognition.onerror = (event) => {
                    console.error('Speech Recognition Error:', event.error);
                    if (event.error !== 'no-speech') {
                        setStatus(`❌ Error: ${event.error}`, '#ff5252');
                    }
                    stopRecognition();
                };

                recognition.onend = () => {
                    if (isRecognitionActive) {
                        // User didn't stop it yet, browser might have timed out
                        if (chatInput.value.trim().length > 0) {
                            handleVoiceComplete();
                        }
                        stopRecognition();
                    }
                };
            }

            async function handleVoiceComplete() {
                const text = chatInput.value.trim();
                if (!text) return;
                addUserMessage(text, manualLang === 'te' ? 'Telugu' : 'English');
                chatInput.value = '';
                await processTextQuery(text);
            }

            function startRecognition() {
                if (!recognition) {
                    setStatus('❌ Speech Recognition not supported in this browser.', '#ff5252');
                    return;
                }
                recognition.lang = manualLang === 'te' ? 'te-IN' : 'en-IN';
                recognition.start();
            }

            function stopRecognition() {
                if (recognition && isRecognitionActive) {
                    isRecognitionActive = false; // Mark inactive first to avoid double-processing
                    recognition.stop();
                    // Process the final result if we haven't yet
                    if (chatInput.value.trim()) {
                        handleVoiceComplete();
                    }
                }
                isRecognitionActive = false;
                micWrapper.classList.remove('recording');
                micBtn?.querySelector('.icon-mic').classList.remove('hidden');
                micBtn?.querySelector('.icon-stop').classList.add('hidden');
                resetStatus();
            }

            micBtn.addEventListener('click', () => {
                if (isRecognitionActive) {
                    stopRecognition();
                } else {
                    startRecognition();
                }
            });

            // ── Backend calls ─────────────────────────────────────────────

            async function processTextQuery(text) {
                setStatus('🤔 PrajaVaani Bot is thinking…', 'var(--accent-blue)');
                const thinkingId = addTypingIndicator();
                const formData = new FormData();
                formData.append('query', text);
                formData.append('lang_override', manualLang);

                try {
                    const res = await fetch(`${BACKEND}/api/text-query`, { method: 'POST', body: formData });
                    if (!res.ok) throw new Error(`Server ${res.status}`);
                    const data = await res.json();

                    removeTypingIndicator(thinkingId);
                    showLangBadge(data.detected_language);
                    addAiMessage(data.english_reply, data.audio_url);
                    resetStatus();
                } catch (err) {
                    console.error('Text API error:', err);
                    removeTypingIndicator(thinkingId);
                    setStatus('❌ Could not reach server. Is it running on port 8000?', '#ff5252');
                }
            }

            // ── UI helpers ────────────────────────────────────────────────
            function setStatus(msg, color = 'var(--text-muted)') {
                statusText.textContent = msg;
                statusText.style.color = color;
            }
            function resetStatus() {
                setStatus('🎙 Tap mic to speak or type below');
            }
            function showLangBadge(label) {
                langBadge.textContent = `🔤 ${label}`;
                langBadge.classList.remove('hidden');
            }

            function scrollToBottom() {
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }

            function nowTime() {
                return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            function addUserMessage(text, langLabel) {
                const wrap = document.createElement('div');
                wrap.className = 'message user';
                wrap.innerHTML = `
                    <div class="msg-body user-body">
                        <div class="msg-text">${escHtml(text)}</div>
                        <div class="msg-meta">${langLabel ? `<span class="inline-lang">${langLabel}</span>` : ''}<span class="msg-time">${nowTime()}</span></div>
                    </div>
                    <div class="msg-avatar user-avatar">👤</div>`;
                chatHistory.appendChild(wrap);
                scrollToBottom();
            }

            function addAiMessage(text, audioUrl) {
                const wrap = document.createElement('div');
                wrap.className = 'message ai';

                const audioHtml = audioUrl ? `
                    <div class="voice-controls">
                        <button class="voice-btn play-btn" title="Play audio response">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <button class="voice-btn pause-btn hidden" title="Pause audio">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        </button>
                        <button class="voice-btn stop-btn hidden" title="Stop audio">
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
                        </button>
                    </div>` : '';

                wrap.innerHTML = `
                    <div class="msg-avatar">🤖</div>
                    <div class="msg-body">
                        <div class="msg-text">${escHtml(text)}</div>
                        <div class="msg-actions">
                            ${audioHtml}
                            <span class="msg-time">${nowTime()}</span>
                        </div>
                    </div>`;

                chatHistory.appendChild(wrap);
                scrollToBottom();

                if (audioUrl) {
                    const playBtn = wrap.querySelector('.play-btn');
                    const pauseBtn = wrap.querySelector('.pause-btn');
                    const stopBtn = wrap.querySelector('.stop-btn');
                    const aud = new Audio(audioUrl);

                    const updateUI = (state) => {
                        if (state === 'playing') {
                            playBtn.classList.add('hidden');
                            pauseBtn.classList.remove('hidden');
                            stopBtn.classList.remove('hidden');
                        } else if (state === 'paused') {
                            playBtn.classList.remove('hidden');
                            pauseBtn.classList.add('hidden');
                            stopBtn.classList.remove('hidden');
                        } else {
                            // Stopped / Ended
                            playBtn.classList.remove('hidden');
                            pauseBtn.classList.add('hidden');
                            stopBtn.classList.add('hidden');
                        }
                    };


                    playBtn.addEventListener('click', () => {
                        aud.play().catch(() => { });
                        updateUI('playing');
                    });

                    pauseBtn.addEventListener('click', () => {
                        aud.pause();
                        updateUI('paused');
                    });

                    stopBtn.addEventListener('click', () => {
                        aud.pause();
                        aud.currentTime = 0;
                        updateUI('stopped');
                    });

                    aud.onended = () => updateUI('stopped');

                    // Auto-play
                    aud.play().then(() => updateUI('playing')).catch(() => { });
                }
            }

            let typingCounter = 0;
            function addTypingIndicator() {
                const id = `typing-${++typingCounter}`;
                const el = document.createElement('div');
                el.className = 'message ai typing-msg';
                el.id = id;
                el.innerHTML = `
                    <div class="msg-avatar">🤖</div>
                    <div class="msg-body"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
                chatHistory.appendChild(el);
                scrollToBottom();
                return id;
            }

            function removeTypingIndicator(id) {
                document.getElementById(id)?.remove();
            }

            function escHtml(text) {
                if (!text) return '';
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML.replace(/\n/g, '<br>');
            }

        }





    }

    // --- Event Listeners ---
    console.log('Attaching event listeners...');
    console.log('forms:', forms);
    console.log('forms.login:', forms.login);
    console.log('forms.register:', forms.register);

    if (links.showRegister) {
        links.showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            showView('register');
        });
        console.log('✓ Show Register listener attached');
    }

    if (links.showLogin) {
        links.showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            showView('login');
        });
        console.log('✓ Show Login listener attached');
    }

    if (forms.register) {
        forms.register.addEventListener('submit', (e) => {
            console.log('Register form submitted!');
            handleRegister(e);
        });
        console.log('✓ Register form listener attached');
    } else {
        console.error('✗ Register form not found!');
    }

    if (forms.login) {
        forms.login.addEventListener('submit', (e) => {
            console.log('Login form submitted!');
            handleLogin(e);
        });
        console.log('✓ Login form listener attached');
    } else {
        console.error('✗ Login form not found!');
    }

    if (links.logout) {
        links.logout.addEventListener('click', handleLogout);
    }

    if (dashboard.navItems) {
        dashboard.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Handle tab switching
                const tab = item.dataset.tab;
                if (tab) switchTab(tab);
            });
        });
    }

    // Password Toggle (Existing functionality, extended)
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function () {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
        });
    });

    // Display eligibility results
    function displayEligibilityResults(data) {
        const resultsDiv = document.getElementById('eligibility-results');

        if (!data.success) {
            resultsDiv.innerHTML = `<div style="padding: 1.5rem; background: linear-gradient(135deg, #fef5f5 0%, #ffe8e8 100%); border: 2px solid #ff6b6b; border-radius: 12px; color: #c92a2a; font-weight: 600; font-size: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <span style="font-size: 1.5rem;">⚠️</span>
                    <div>
                        <strong>Error:</strong> ${data.message || 'Could not check eligibility'}
                    </div>
                </div>
            </div>`;
            resultsDiv.style.display = 'block';
            return;
        }

        const { results, summary } = data;
        const eligibleSchemes = results.eligible || [];
        const ineligibleSchemes = results.ineligible || [];

        if (eligibleSchemes.length === 0 && ineligibleSchemes.length === 0) {
            resultsDiv.innerHTML = `<div style="padding: 2rem; background: linear-gradient(135deg, #e1f5fe 0%, #e8f4ff 100%); border: 2px dashed #4a90e2; border-radius: 12px; text-align: center; color: #1a3a52; font-weight: 600; font-size: 1rem;">
                <span style="font-size: 1.8rem; display: block; margin-bottom: 0.5rem;">📭</span>
                No schemes found in database
            </div>`;
            resultsDiv.style.display = 'block';
            return;
        }

        // Build HTML for eligible schemes
        const eligibleHTML = eligibleSchemes.length > 0 ? `
            <div style="margin-bottom: 2rem;">
                <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.5rem;">
                    <span style="font-size: 1.8rem;">✅</span>
                    <h4 style="margin: 0; color: #22863a; font-size: 1.2rem; font-weight: 700;">Eligible Schemes <span style="background: #c3e9c9; color: #22863a; padding: 0.3rem 0.7rem; border-radius: 20px; font-size: 0.85rem; margin-left: 0.5rem;">${eligibleSchemes.length}</span></h4>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${eligibleSchemes.map(scheme => `
                        <div class="scheme-card" data-id="${scheme.id}" style="border-left: 5px solid #22863a; border-radius: 10px; padding: 1.5rem; background: linear-gradient(135deg, #ffffff 0%, #f5fff7 100%); cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(34,134,58,0.1);" onMouseOver="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 16px rgba(34,134,58,0.2)'" onMouseOut="this.style.transform='none'; this.style.boxShadow='0 2px 8px rgba(34,134,58,0.1)'">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <span style="background: #c3e9c9; color: #22863a; padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.85rem; font-weight: 700;">✓ ELIGIBLE</span>
                                <div style="text-align: right;">
                                    <div style="font-size: 2rem; font-weight: 700; color: #22863a; line-height: 1;">${Math.round((scheme.confidence || 0) * 100)}%</div>
                                    <div style="font-size: 0.75rem; color: #5a6c7d; font-weight: 600;">Match</div>
                                </div>
                            </div>
                            <h3 style="margin: 0.8rem 0; color: #1a3a52; font-size: 1.1rem; font-weight: 700;">${scheme.title}</h3>
                            <p style="font-size: 0.9rem; color: #5a6c7d; margin: 0.8rem 0; font-weight: 500;">🏢 ${scheme.government || 'Government Scheme'}</p>
                            <button class="scheme-detail-btn view-more-details-btn" data-id="${scheme.id}" style="margin-top: 1.2rem; width: 100%; font-weight: 700; font-size: 0.95rem; padding: 0.9rem; background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%); color: #ffffff; border: none; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 6px rgba(74,144,226,0.2);">
                                📖 View More Details
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        // Build HTML for ineligible schemes (top 5)
        const topIneligible = ineligibleSchemes.slice(0, 5);
        const ineligibleHTML = topIneligible.length > 0 ? `
            <div style="margin-top: 2.5rem; border-top: 2px solid #e8f0ff; padding-top: 2rem;">
                <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.5rem;">
                    <span style="font-size: 1.8rem;">ℹ️</span>
                    <h4 style="margin: 0; color: #da3633; font-size: 1.2rem; font-weight: 700;">Cannot Access <span style="background: #fae8e6; color: #da3633; padding: 0.3rem 0.7rem; border-radius: 20px; font-size: 0.85rem; margin-left: 0.5rem;">${ineligibleSchemes.length}</span></h4>
                </div>
                <p style="color: #5a6c7d; font-size: 0.95rem; margin-bottom: 1.5rem; font-weight: 500;">You may not meet the requirements for these schemes. Check the missing criteria below.</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${topIneligible.map(scheme => `
                        <div style="border-left: 5px solid #da3633; border-radius: 10px; padding: 1.5rem; background: linear-gradient(135deg, #ffffff 0%, #fff8f7 100%); opacity: 0.85; box-shadow: 0 2px 8px rgba(218,54,51,0.08);">
                            <div style="display: flex; align-items: flex-start; gap: 0.8rem; margin-bottom: 0.8rem;">
                                <span style="background: #fae8e6; color: #da3633; padding: 0.4rem 0.7rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">✗ NOT ELIGIBLE</span>
                            </div>
                            <h3 style="margin: 0.8rem 0; color: #1a3a52; font-size: 1.05rem; font-weight: 700;">${scheme.title}</h3>
                            <p style="font-size: 0.9rem; color: #5a6c7d; margin: 0.8rem 0; font-weight: 500;">🏢 ${scheme.government || 'Government Scheme'}</p>
                            <div style="background: #fef5f5; border: 1px solid #ffc4c2; border-radius: 6px; padding: 0.9rem; margin-top: 1rem;">
                                <p style="margin: 0 0 0.6rem 0; font-size: 0.85rem; font-weight: 700; color: #da3633;">Missing Requirements:</p>
                                <p style="margin: 0; font-size: 0.85rem; color: #1a3a52; font-weight: 600;">
                                    ${scheme.missing_criteria && scheme.missing_criteria.length > 0 ?
                scheme.missing_criteria.slice(0, 3).map(c => `• ${c}`).join('<br>') + (scheme.missing_criteria.length > 3 ? '<br>• ... and more' : '')
                : '• Various criteria'}
                                </p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        resultsDiv.innerHTML = `
            <div style="background: linear-gradient(135deg, #f8fafb 0%, #ffffff 100%); padding: 2rem; border-radius: 12px; border: 2px solid #e8f0ff;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; border-bottom: 2px solid #e8f0ff; padding-bottom: 1.5rem;">
                    <div>
                        <h3 style="margin: 0; color: #1a3a52; font-size: 1.4rem; font-weight: 700;">Results Summary</h3>
                        <p style="color: #5a6c7d; margin: 0.5rem 0 0 0; font-weight: 500;">Your eligibility across government schemes</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                    <div style="background: linear-gradient(135deg, #c3e9c9 0%, #a8ddb5 100%); border-radius: 10px; padding: 1.2rem; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: 700; color: #22863a;">${summary.eligible_count}</div>
                        <div style="font-size: 0.9rem; font-weight: 700; color: #22863a; margin-top: 0.3rem;">Eligible Schemes</div>
                        <div style="font-size: 0.8rem; color: rgba(34, 134, 58, 0.8); margin-top: 0.2rem;">You can apply for these</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fae8e6 0%, #f5d4d0 100%); border-radius: 10px; padding: 1.2rem; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: 700; color: #da3633;">${summary.ineligible_count}</div>
                        <div style="font-size: 0.9rem; font-weight: 700; color: #da3633; margin-top: 0.3rem;">Not Eligible</div>
                        <div style="font-size: 0.8rem; color: rgba(218, 54, 51, 0.8); margin-top: 0.2rem;">Need to meet requirements</div>
                    </div>
                </div>
                
                ${eligibleHTML}
                ${ineligibleHTML}
            </div>
        `;
        resultsDiv.style.display = 'block';

        // Store results in STATE for access when viewing details
        STATE.eligibilityResults = [...eligibleSchemes, ...ineligibleSchemes];

        // Attach click handlers to scheme detail buttons
        resultsDiv.querySelectorAll('.scheme-detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const schemeId = btn.getAttribute('data-id');
                const scheme = STATE.eligibilityResults.find(s => s.id === schemeId);
                if (scheme) {
                    STATE.selectedSchemeId = schemeId;
                    renderTab('schemes');
                }
            });
        });
    }

    // --- Fake Scheme Detector ---
    function renderFakeSchemeTab() {
        return `
            <style>
                .fake-card {
                    background: var(--glass-bg);
                    backdrop-filter: var(--backdrop-blur);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    padding: 2.5rem;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                    max-width: 800px;
                    margin: 0 auto;
                }
                .fake-textarea {
                    width: 100%;
                    min-height: 150px;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: var(--radius-md);
                    padding: 1rem;
                    color: var(--text-main);
                    font-size: 1rem;
                    resize: vertical;
                    margin-bottom: 1.5rem;
                }
                .fake-textarea:focus {
                    outline: none;
                    border-color: #ff6d00;
                    box-shadow: 0 0 15px rgba(255, 109, 0, 0.2);
                }
                .fake-btn {
                    width: 100%;
                    padding: 1rem;
                    border: none;
                    border-radius: var(--radius-pill);
                    background: linear-gradient(45deg, #ff6d00, #ff9100);
                    color: #ffffff;
                    font-weight: 700;
                    cursor: pointer;
                    transition: transform 0.3s;
                }
                .fake-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(255, 109, 0, 0.4);
                }
                .fake-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .fake-results {
                    margin-top: 2rem;
                    display: none;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 1.5rem;
                }
                .meter-bg {
                    background: rgba(0, 0, 0, 0.3);
                    height: 12px;
                    border-radius: 6px;
                    overflow: hidden;
                    margin: 1rem 0;
                }
                .meter-fill {
                    height: 100%;
                    transition: width 0.5s ease-out, background 0.5s;
                }
                .patterns-list {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    margin-top: 1rem;
                }
                .patterns-list ul {
                    margin: 0;
                    padding-left: 1.5rem;
                    color: var(--text-muted);
                }

            </style>
            
            <div class="fake-card">
                <h3 style="margin-top:0; color:var(--text-main); font-size:1.5rem;">🔎 Analyze Scheme Message</h3>
                <p style="color:var(--text-muted); margin-bottom:1.5rem;">Paste a WhatsApp forward, SMS, or website description below to estimate if it's a real government scheme or a potential scam.</p>
                
                <textarea id="fake-input" class="fake-textarea" placeholder="Paste the scheme message here..."></textarea>
                <button id="fake-analyze-btn" class="fake-btn">Analyze Message</button>
                
                <div id="fake-results" class="fake-results">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:1.1rem; font-weight:600;">Risk Score: <span id="fake-score-text">0%</span></span>
                        <span id="fake-label" style="padding:0.3rem 0.8rem; border-radius:30px; font-weight:700; font-size:0.9rem;"></span>
                    </div>
                    
                    <div class="meter-bg">
                        <div id="fake-meter" class="meter-fill" style="width: 0%; background: #00e676;"></div>
                    </div>
                    
                    <div class="patterns-list">
                        <h4 style="margin:0 0 0.5rem 0; font-size:0.95rem;">Detected Patterns:</h4>
                        <ul id="fake-patterns"></ul>
                    </div>
                </div>
                

            </div>
        `;
    }

    function initFakeSchemeDetector() {
        const btn = document.getElementById('fake-analyze-btn');
        const input = document.getElementById('fake-input');
        const results = document.getElementById('fake-results');
        const meter = document.getElementById('fake-meter');
        const scoreText = document.getElementById('fake-score-text');
        const labelText = document.getElementById('fake-label');
        const patternsList = document.getElementById('fake-patterns');

        if (!btn || !input) return;

        btn.addEventListener('click', async () => {
            const text = input.value.trim();
            if (!text) return;

            btn.disabled = true;
            btn.textContent = 'Analyzing...';
            results.style.display = 'none';

            try {
                const response = await fetch('http://localhost:5000/api/check-fake-scheme', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });

                let data;
                try {
                    data = await response.json();
                } catch (e) {
                    throw new Error("Server returned invalid response. Is the backend running?");
                }

                if (!response.ok) throw new Error(data.error || 'Server error');

                const score = data.risk_score;
                scoreText.textContent = score + '%';
                meter.style.width = score + '%';

                let color = '#22863a'; // Green
                let bg = 'rgba(34, 134, 58, 0.15)';
                if (data.label !== "Real Scheme") { 
                    color = '#ff1744'; 
                    bg = 'rgba(255, 23, 68, 0.2)'; 
                }

                meter.style.background = color;

                labelText.textContent = data.label;
                labelText.style.color = color;
                labelText.style.backgroundColor = bg;

                const meterContainer = document.querySelector('.meter-bg');
                const patternsContainer = document.querySelector('.patterns-list');
                const scoreTextParent = scoreText.parentElement;

                if (data.label === "Real Scheme") {
                    scoreTextParent.style.display = 'none';
                    meterContainer.style.display = 'none';
                    patternsContainer.style.display = 'none';
                } else {
                    scoreTextParent.style.display = '';
                    meterContainer.style.display = 'block';
                    patternsContainer.style.display = 'block';

                    patternsList.innerHTML = '';
                    data.detected_patterns.forEach(p => {
                        const li = document.createElement('li');
                        li.textContent = p;
                        patternsList.appendChild(li);
                    });
                }

                results.style.display = 'block';
            } catch (err) {
                alert('Failed to analyze scheme: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Analyze Message';
            }
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       FEE REIMBURSEMENT ESTIMATOR TAB
       ═══════════════════════════════════════════════════════════════ */

    function renderFeeReimbursementTab() {
        return `
        <style>
            .fre-container { max-width: 800px; margin: 0 auto; }
            .fre-card {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
                border: 2px solid #e8f0ff;
                border-radius: 12px;
                padding: 2rem;
            }
            .fre-section-label {
                background: #e1f5fe;
                border-left: 4px solid #4a90e2;
                border-radius: 8px;
                padding: 1rem;
                margin: 1.2rem 0 0.8rem 0;
            }
            .fre-section-label p { margin: 0; font-size: 0.9rem; font-weight: 700; color: #1a3a52; }
            .fre-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
            .fre-label { font-size: 0.95rem; font-weight: 600; color: #1a3a52; display: block; margin-bottom: 0.5rem; }
            .fre-input, .fre-select {
                width: 100%; padding: 0.9rem 1rem;
                border: 2px solid #d4e4f7; border-radius: 8px;
                font-size: 0.95rem; font-weight: 500; color: #1a3a52;
                background: #ffffff !important; transition: all 0.3s ease;
                font-family: inherit; -webkit-appearance: none;
            }
            .fre-input:focus, .fre-select:focus {
                border-color: #4a90e2;
                box-shadow: 0 0 0 3px rgba(74,144,226,0.1);
                outline: none;
            }
            .fre-submit {
                margin-top: 2rem; width: 100%; font-weight: 700; font-size: 1rem;
                padding: 1rem; background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
                color: #ffffff; border: none; border-radius: 8px; cursor: pointer;
                transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(74,144,226,0.3);
            }
            .fre-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(74,144,226,0.4); }
            .fre-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
            .fre-result-card {
                margin-top: 2rem; border-radius: 12px; padding: 2rem;
                border: 2px solid; animation: freFadeIn 0.4s ease;
            }
            .fre-result-eligible {
                background: linear-gradient(135deg, #f5fff7 0%, #e8f9ee 100%);
                border-color: #22863a;
            }
            .fre-result-ineligible {
                background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
                border-color: #da3633;
            }
            .fre-amount {
                font-size: 2.2rem; font-weight: 800; margin: 0.5rem 0;
                background: linear-gradient(135deg, #4a90e2, #22863a);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            }
            .fre-docs { margin-top: 1.5rem; animation: freFadeIn 0.5s ease 0.2s both; }
            .fre-doc-item {
                display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 0;
                border-bottom: 1px solid #e8f0ff; color: #1a3a52; font-weight: 500;
            }
            .fre-explanation li {
                color: #1a3a52; font-weight: 500; margin: 0.5rem 0; line-height: 1.6;
            }
            @keyframes freFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .fre-hidden { display: none !important; }
        </style>

        <div class="fre-container">
            <div class="fre-card">
                <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.8rem;">🎓</span>
                    <h3 style="margin: 0; color: #1a3a52; font-size: 1.5rem; font-weight: 700;">Fee Reimbursement Estimator</h3>
                </div>
                <p style="color: #5a6c7d; font-size: 0.95rem; margin-top: 0.3rem; font-weight: 500;">📍 Telangana Scholarships | Estimate your fee reimbursement amount</p>

                <form id="fre-form" style="display: grid; gap: 1rem; margin-top: 1.5rem;">
                    <!-- Education Level -->
                    <div class="fre-section-label"><p>📚 Education Level</p></div>
                    <div>
                        <label class="fre-label">Select Education Level <span style="color:#e74c3c;">*</span></label>
                        <select id="fre-edu-level" class="fre-select" required>
                            <option value="">Select Level...</option>
                            <option value="class-5-8">Class 5–8</option>
                            <option value="class-9-10">Class 9–10</option>
                            <option value="intermediate">Intermediate (11–12)</option>
                            <option value="diploma">Diploma</option>
                            <option value="degree">Degree / Professional (B.Tech, MBA, etc.)</option>
                        </select>
                    </div>

                    <!-- Dynamic Fields Container -->
                    <div id="fre-dynamic-fields" class="fre-hidden">
                        <div class="fre-section-label"><p>👤 Your Details</p></div>
                        <div class="fre-grid" style="margin-top: 0.5rem;">
                            <div>
                                <label class="fre-label">Category <span style="color:#e74c3c;">*</span></label>
                                <select id="fre-category" class="fre-select" required>
                                    <option value="">Select Category...</option>
                                    <option value="SC">SC (Scheduled Caste)</option>
                                    <option value="ST">ST (Scheduled Tribe)</option>
                                    <option value="BC">BC (Backward Caste)</option>
                                    <option value="EBC">EBC (Extremely Backward)</option>
                                    <option value="Minority">Minority</option>
                                    <option value="Disabled">Disabled</option>
                                    <option value="General">General</option>
                                </select>
                            </div>
                            <div>
                                <label class="fre-label">Annual Income (₹) <span style="color:#e74c3c;">*</span></label>
                                <input type="number" id="fre-income" class="fre-input" placeholder="e.g., 150000" min="0" required>
                            </div>
                        </div>

                        <!-- Gender (Class 5-10 only) -->
                        <div id="fre-gender-group" class="fre-hidden" style="margin-top: 1rem;">
                            <div class="fre-grid">
                                <div>
                                    <label class="fre-label">Gender <span style="color:#e74c3c;">*</span></label>
                                    <select id="fre-gender" class="fre-select">
                                        <option value="">Select Gender...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="fre-label">School Type</label>
                                    <select id="fre-school-type" class="fre-select">
                                        <option value="Govt">Government</option>
                                        <option value="Aided">Aided</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Hosteller (Class 9-10, Intermediate) -->
                        <div id="fre-hosteller-group" class="fre-hidden" style="margin-top: 1rem;">
                            <div class="fre-grid">
                                <div>
                                    <label class="fre-label">Residential Status</label>
                                    <select id="fre-hosteller" class="fre-select">
                                        <option value="day">Day Scholar</option>
                                        <option value="hosteller">Hosteller</option>
                                    </select>
                                </div>
                                <div id="fre-college-type-wrapper" class="fre-hidden">
                                    <label class="fre-label">College Type</label>
                                    <select id="fre-college-type" class="fre-select">
                                        <option value="Govt">Government</option>
                                        <option value="Aided">Aided</option>
                                        <option value="Private">Private</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Tuition Fee (Diploma, Degree) -->
                        <div id="fre-fee-group" class="fre-hidden" style="margin-top: 1rem;">
                            <div class="fre-grid">
                                <div>
                                    <label class="fre-label">Tuition Fee (₹/year) <span style="color:#e74c3c;">*</span></label>
                                    <input type="number" id="fre-tuition-fee" class="fre-input" placeholder="e.g., 35000" min="0">
                                </div>
                                <div id="fre-course-type-wrapper" class="fre-hidden">
                                    <label class="fre-label">Course Type</label>
                                    <select id="fre-course-type" class="fre-select">
                                        <option value="BTech">B.Tech / Engineering</option>
                                        <option value="MBA">MBA / MCA</option>
                                        <option value="Degree">Degree (BA/BSc/BCom)</option>
                                        <option value="Other">Other Professional</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Rank (Degree only) -->
                        <div id="fre-rank-group" class="fre-hidden" style="margin-top: 1rem;">
                            <div class="fre-grid">
                                <div>
                                    <label class="fre-label">EAPCET / ECET Rank</label>
                                    <input type="number" id="fre-rank" class="fre-input" placeholder="e.g., 5000" min="1">
                                </div>
                                <div>
                                    <label class="fre-label">Area Type</label>
                                    <select id="fre-area" class="fre-select">
                                        <option value="Rural">Rural</option>
                                        <option value="Urban">Urban</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Area Type for non-degree (shown for income limit check) -->
                        <div id="fre-area-simple-group" class="fre-hidden" style="margin-top: 1rem;">
                            <div class="fre-grid">
                                <div>
                                    <label class="fre-label">Area Type</label>
                                    <select id="fre-area-simple" class="fre-select">
                                        <option value="Rural">Rural</option>
                                        <option value="Urban">Urban</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" class="fre-submit" id="fre-submit-btn">🎯 Estimate Benefit</button>
                </form>
            </div>

            <!-- Result -->
            <div id="fre-result-container"></div>

            <!-- Documents -->
            <div id="fre-docs-container"></div>

            <!-- Official Link (shown after result) -->
            <div id="fre-link-container"></div>
        </div>
        `;
    }

    function initFeeReimbursementEstimator() {
        const eduLevel = document.getElementById('fre-edu-level');
        const dynamicFields = document.getElementById('fre-dynamic-fields');
        const genderGroup = document.getElementById('fre-gender-group');
        const hostellerGroup = document.getElementById('fre-hosteller-group');
        const collegeTypeWrapper = document.getElementById('fre-college-type-wrapper');
        const feeGroup = document.getElementById('fre-fee-group');
        const courseTypeWrapper = document.getElementById('fre-course-type-wrapper');
        const rankGroup = document.getElementById('fre-rank-group');
        const areaSimpleGroup = document.getElementById('fre-area-simple-group');
        const form = document.getElementById('fre-form');

        if (!eduLevel || !form) return;

        // Dynamic field visibility
        eduLevel.addEventListener('change', () => {
            const level = eduLevel.value;
            if (!level) {
                dynamicFields.classList.add('fre-hidden');
                return;
            }
            dynamicFields.classList.remove('fre-hidden');

            // Reset all optional groups
            [genderGroup, hostellerGroup, collegeTypeWrapper, feeGroup, courseTypeWrapper, rankGroup, areaSimpleGroup].forEach(el => el.classList.add('fre-hidden'));

            if (level === 'class-5-8') {
                genderGroup.classList.remove('fre-hidden');
                areaSimpleGroup.classList.remove('fre-hidden');
            } else if (level === 'class-9-10') {
                genderGroup.classList.remove('fre-hidden');
                hostellerGroup.classList.remove('fre-hidden');
                areaSimpleGroup.classList.remove('fre-hidden');
            } else if (level === 'intermediate') {
                hostellerGroup.classList.remove('fre-hidden');
                collegeTypeWrapper.classList.remove('fre-hidden');
                areaSimpleGroup.classList.remove('fre-hidden');
            } else if (level === 'diploma') {
                feeGroup.classList.remove('fre-hidden');
                collegeTypeWrapper.classList.remove('fre-hidden');
                areaSimpleGroup.classList.remove('fre-hidden');
            } else if (level === 'degree') {
                feeGroup.classList.remove('fre-hidden');
                courseTypeWrapper.classList.remove('fre-hidden');
                rankGroup.classList.remove('fre-hidden');
            }

            // Clear previous results
            document.getElementById('fre-result-container').innerHTML = '';
            document.getElementById('fre-docs-container').innerHTML = '';
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const level = eduLevel.value;
            const category = document.getElementById('fre-category').value;
            const income = parseInt(document.getElementById('fre-income').value) || 0;
            const gender = document.getElementById('fre-gender').value;
            const hosteller = document.getElementById('fre-hosteller').value;
            const tuitionFee = parseInt(document.getElementById('fre-tuition-fee').value) || 0;
            const rank = parseInt(document.getElementById('fre-rank').value) || 0;
            const courseType = document.getElementById('fre-course-type').value;
            const area = (level === 'degree') ? document.getElementById('fre-area').value : document.getElementById('fre-area-simple').value;

            if (!level || !category) {
                alert('Please select Education Level and Category.');
                return;
            }
            if (!income && income !== 0) {
                alert('Please enter your Annual Income.');
                return;
            }

            // === ELIGIBILITY & ESTIMATION LOGIC ===
            let eligible = false;
            let amount = 0;
            let explanations = [];
            let amountLabel = '';

            // Check category eligibility
            const eligibleCategories = ['SC', 'ST', 'BC', 'EBC', 'Minority', 'Disabled'];
            if (!eligibleCategories.includes(category)) {
                eligible = false;
                explanations.push('❌ General category is not eligible for fee reimbursement under Telangana scholarship schemes.');
                renderResult(eligible, 0, '', category, explanations, level);
                return;
            }

            // Income limit check
            const isSCST = (category === 'SC' || category === 'ST');
            let incomeLimit;
            if (isSCST) {
                incomeLimit = 200000;
            } else {
                incomeLimit = (area === 'Rural') ? 150000 : 200000;
            }

            if (income > incomeLimit) {
                eligible = false;
                explanations.push(`❌ Income ₹${income.toLocaleString('en-IN')} exceeds the limit of ₹${incomeLimit.toLocaleString('en-IN')} for ${category} (${area}).`);
                renderResult(eligible, 0, '', category, explanations, level);
                return;
            }
            explanations.push(`✅ Income ₹${income.toLocaleString('en-IN')} is within the ₹${incomeLimit.toLocaleString('en-IN')} limit for ${category} category.`);
            eligible = true;

            // Calculate amount based on level
            if (level === 'class-5-8') {
                if (gender === 'Female') {
                    amount = 150 * 10; // 10 months
                    amountLabel = '₹150/month × 10 months';
                    explanations.push('✅ Girls receive ₹150/month stipend for Class 5–8.');
                } else {
                    amount = 100 * 10;
                    amountLabel = '₹100/month × 10 months';
                    explanations.push('✅ Boys receive ₹100/month stipend for Class 5–8.');
                }
            } else if (level === 'class-9-10') {
                if (hosteller === 'hosteller') {
                    amount = (350 * 10) + 1000;
                    amountLabel = '₹350/month × 10 months + ₹1,000 books';
                    explanations.push('✅ Hostellers receive ₹350/month + ₹1,000 book allowance for Class 9–10.');
                } else {
                    amount = (150 * 10) + 750;
                    amountLabel = '₹150/month × 10 months + ₹750 books';
                    explanations.push('✅ Day scholars receive ₹150/month + ₹750 book allowance for Class 9–10.');
                }
            } else if (level === 'intermediate') {
                const baseAmount = 850;
                const maintenance = (hosteller === 'hosteller') ? 3000 : 1500;
                amount = baseAmount + maintenance;
                amountLabel = `₹${baseAmount} tuition + ₹${maintenance.toLocaleString('en-IN')} maintenance`;
                explanations.push(`✅ Basic tuition reimbursement of ₹${baseAmount}/year.`);
                explanations.push(`✅ ${hosteller === 'hosteller' ? 'Hosteller' : 'Day scholar'} maintenance allowance: ₹${maintenance.toLocaleString('en-IN')}.`);
            } else if (level === 'diploma') {
                if (isSCST) {
                    amount = tuitionFee;
                    amountLabel = `Full fee: ₹${tuitionFee.toLocaleString('en-IN')}`;
                    explanations.push('✅ SC/ST students receive full tuition fee reimbursement for Diploma.');
                } else {
                    const cap = 20000;
                    amount = Math.min(tuitionFee, cap);
                    amountLabel = tuitionFee > cap
                        ? `Capped: ₹${cap.toLocaleString('en-IN')} (fee was ₹${tuitionFee.toLocaleString('en-IN')})`
                        : `Full fee: ₹${tuitionFee.toLocaleString('en-IN')}`;
                    explanations.push(`✅ ${category} category diploma reimbursement capped at ₹${cap.toLocaleString('en-IN')}.`);
                }
            } else if (level === 'degree') {
                if (isSCST) {
                    amount = tuitionFee;
                    amountLabel = `Full fee: ₹${tuitionFee.toLocaleString('en-IN')}`;
                    explanations.push('✅ SC/ST students receive full fee reimbursement regardless of rank.');
                } else if (rank > 0 && rank <= 10000) {
                    amount = tuitionFee;
                    amountLabel = `Full fee: ₹${tuitionFee.toLocaleString('en-IN')}`;
                    explanations.push(`✅ Rank ${rank.toLocaleString('en-IN')} ≤ 10,000 → Full fee reimbursement.`);
                } else {
                    let cap = 35000;
                    if (courseType === 'MBA') cap = 27000;
                    else if (courseType === 'Degree') cap = 20000;

                    amount = Math.min(tuitionFee, cap);
                    const courseLabel = courseType === 'BTech' ? 'B.Tech' : courseType === 'MBA' ? 'MBA/MCA' : courseType;
                    if (tuitionFee > cap) {
                        amountLabel = `Capped at ₹${cap.toLocaleString('en-IN')} (fee: ₹${tuitionFee.toLocaleString('en-IN')})`;
                        explanations.push(`✅ ${courseLabel} reimbursement capped at ₹${cap.toLocaleString('en-IN')}.`);
                    } else {
                        amountLabel = `Full fee: ₹${tuitionFee.toLocaleString('en-IN')}`;
                        explanations.push(`✅ Fee within ${courseLabel} cap of ₹${cap.toLocaleString('en-IN')}.`);
                    }
                    if (rank > 10000) {
                        explanations.push(`ℹ️ Rank ${rank.toLocaleString('en-IN')} > 10,000 — course fee cap applied.`);
                    } else if (!rank) {
                        explanations.push('ℹ️ No rank provided — course fee cap applied.');
                    }
                }
            }

            explanations.push(`✅ Eligible under ${category} category.`);
            renderResult(eligible, amount, amountLabel, category, explanations, level);
        });

        function renderResult(eligible, amount, amountLabel, category, explanations, level) {
            const resultContainer = document.getElementById('fre-result-container');
            const docsContainer = document.getElementById('fre-docs-container');

            const statusClass = eligible ? 'fre-result-eligible' : 'fre-result-ineligible';
            const statusIcon = eligible ? '✅' : '❌';
            const statusText = eligible ? 'Eligible' : 'Not Eligible';
            const statusColor = eligible ? '#22863a' : '#da3633';

            resultContainer.innerHTML = `
                <div class="fre-result-card ${statusClass}">
                    <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1rem;">
                        <span style="font-size: 2rem;">${statusIcon}</span>
                        <div>
                            <h3 style="margin: 0; color: ${statusColor}; font-size: 1.3rem; font-weight: 700;">${statusText}</h3>
                            <p style="margin: 0.2rem 0 0 0; color: #5a6c7d; font-size: 0.9rem;">Category: ${category}</p>
                        </div>
                    </div>
                    ${eligible ? `
                        <div style="margin: 1.5rem 0; padding: 1.2rem; background: white; border-radius: 10px; text-align: center; border: 1px solid #e8f0ff;">
                            <div style="font-size: 0.85rem; color: #5a6c7d; font-weight: 600; margin-bottom: 0.3rem;">Estimated Reimbursement</div>
                            <div class="fre-amount">₹${amount.toLocaleString('en-IN')}</div>
                            <div style="font-size: 0.85rem; color: #5a6c7d; margin-top: 0.3rem;">${amountLabel}</div>
                        </div>
                    ` : ''}
                    <div style="margin-top: 1rem;">
                        <h4 style="color: #1a3a52; font-size: 1rem; font-weight: 700; margin: 0 0 0.8rem 0;">📋 Explanation</h4>
                        <ul class="fre-explanation" style="margin: 0; padding-left: 1.2rem;">
                            ${explanations.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;

            // Show documents only if eligible
            if (eligible) {
                const docs = getRequiredDocuments(level);
                docsContainer.innerHTML = `
                    <div class="fre-docs" style="background: #ffffff; border: 2px solid #e8f0ff; border-radius: 12px; padding: 1.5rem; margin-top: 1.5rem;">
                        <h4 style="color: #1a3a52; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.6rem;">
                            <span>📄</span> Required Documents
                        </h4>
                        ${docs.map(d => `
                            <div class="fre-doc-item">
                                <span style="color: #4a90e2; font-weight: 700;">✔</span>
                                <span>${d}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                docsContainer.innerHTML = '';
            }

            // Show official link after docs
            const linkContainer = document.getElementById('fre-link-container');
            if (eligible) {
                linkContainer.innerHTML = `
                    <p style="text-align: center; margin-top: 1.5rem; font-size: 1rem; color: #1e293b; font-weight: 500;">
                        For more information, visit 
                        <a href="https://telanganaepass.cgg.gov.in/" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; font-weight: 700; text-decoration: none; border-bottom: 2px solid rgba(96, 165, 250, 0.3); transition: all 0.2s ease;" onmouseover="this.style.borderBottomColor='#60a5fa'; this.style.color='#93c5fd'" onmouseout="this.style.borderBottomColor='rgba(96, 165, 250, 0.3)'; this.style.color='#60a5fa'">telanganaepass.cgg.gov.in ↗</a>
                    </p>
                `;
            } else {
                linkContainer.innerHTML = '';
            }

            // Scroll to result
            setTimeout(() => {
                resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

        function getRequiredDocuments(level) {
            const base = ['Caste Certificate', 'Income Certificate', 'Aadhaar Card', 'Bonafide Certificate', 'Bank Passbook / Account Details'];
            if (level === 'class-5-8') return base;
            if (level === 'class-9-10') return base;
            if (level === 'intermediate') return [...base, 'SSC Marks Memo'];
            if (level === 'diploma') return [...base, 'SSC Marks Memo'];
            if (level === 'degree') return [...base, 'EAPCET / ECET Rank Card', 'Previous Marks Memo (Inter / Diploma)'];
            return base;
        }
    }

    /* ═══════════════════════════════════════════════════════════════
       PLACEHOLDER TAB (Coming Soon)
       ═══════════════════════════════════════════════════════════════ */

    function renderPlaceholderTab(icon, title, description) {
        return `
        <div style="max-width: 600px; margin: 4rem auto; text-align: center;">
            <div style="background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%); border: 2px solid #e8f0ff; border-radius: 16px; padding: 3rem 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${icon}</div>
                <h2 style="color: #1a3a52; font-size: 1.8rem; font-weight: 700; margin: 0 0 0.8rem 0;">${title}</h2>
                <p style="color: #5a6c7d; font-size: 1rem; line-height: 1.6; font-weight: 500; margin: 0 0 2rem 0;">${description}</p>
                <div style="display: inline-flex; align-items: center; gap: 0.6rem; background: #e1f5fe; border: 2px solid #4a90e2; border-radius: 30px; padding: 0.8rem 1.5rem;">
                    <span style="font-size: 1.2rem;">🚧</span>
                    <span style="color: #4a90e2; font-weight: 700; font-size: 0.95rem;">Coming Soon</span>
                </div>
                <p style="color: #b0bec5; font-size: 0.85rem; margin-top: 1.5rem; font-style: italic;">This feature is under development and will be available in a future update.</p>
            </div>
        </div>
        `;
    }

});
