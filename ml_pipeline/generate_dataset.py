import pandas as pd
import random
import os

# Real Scheme Templates
# Formal, no urgency, no payment, official domains
real_templates = [
    "Apply for {scheme} through the official portal {domain}. Eligible citizens must submit {doc}.",
    "The {scheme} provides financial assistance to eligible families. Visit {domain} for guidelines.",
    "Citizens can register for {scheme} at their nearest help centre or online via {domain}.",
    "Under the {governing_body}, {scheme} offers support to {demographic}. Required documents include {doc}.",
    "To avail the benefits of {scheme}, please submit an application on {domain} before the official deadline.",
    "Government announces {scheme} for {demographic}. Ensure {doc} is updated when applying at {domain}.",
    "Details regarding the eligibility criteria for {scheme} have been published on {domain}.",
    "Beneficiaries of {scheme} can check their application status via the official website {domain}."
]

schemes = ["PM-KISAN", "Kalyana Lakshmi", "Rythu Bharosa", "Mahalakshmi Scheme", "Ayushman Bharat", "PM Awas Yojana"]
domains = ["india.gov.in", "telangana.gov.in", "pmkisan.gov.in", "pmjay.gov.in", "scheme-official.gov.in"]
docs = ["income certificate", "Aadhaar card", "birth certificate", "ration card", "domicile certificate"]
governing_bodies = ["Ministry of Finance", "State Welfare Department", "Government of India", "Department of Agriculture"]
demographics = ["farmers", "students below poverty line", "rural women", "senior citizens", "economically weaker sections"]

# Fake Scheme Templates
# Urgency, payment, unrealistic offers, WhatsApp forward, suspicious URLs
fake_templates = [
    "Government giving {offer} to everyone. Register now at {sus_domain} and pay {fee} to activate.",
    "URGENT: {scheme} applications close today! Click {sus_domain} and pay {fee} registration fee. Share with 10 people!",
    "Congratulations! You are selected for {offer}. Pay {fee} processing fee at {sus_domain} to claim your benefit.",
    "Limited time offer! Apply fast on {sus_domain} to get {offer}. Share this message with 15 WhatsApp groups.",
    "WhatsApp Forward: Government is giving {offer}. Forward this to 5 people and pay {fee} at {sus_domain}.",
    "Your {scheme} funds are blocked! Share the 6-digit OTP sent to your mobile to verify your bank account at {sus_domain}.",
    "Dear bank customer, your account linked to {scheme} needs KYC update. Click {sus_domain} and verify with OTP.",
    "{offer} credited to your account! Pay {fee} transaction charge at {sus_domain} to release the funds.",
    "Your recent transaction for {scheme} failed. Please share OTP to process the refund immediately at {sus_domain}.",
    "Share your OTP and get benefitted.",
    "Share OTP to process your {scheme} application.",
    "Provide bank details and OTP for {scheme} verification.",
    "Update your KYC now. Share OTP to avoid account block."
]

fake_offers = ["₹1 lakh for all citizens", "free laptops and ₹50,000", "₹75,000 cash prize", "guaranteed government job", "₹2 lakh loan without documents"]
sus_domains = ["gov-benefit-2026.com", "apply-now.xyz", "free-money.online", "support-now.com", "gov-schemes-portal.info", "whatsapp-rewards.com"]
fake_fees = ["₹199", "₹299", "₹500", "a small ₹99 processing fee", "₹1000 refundable fee"]

dataset = []

for _ in range(300):
    text = random.choice(real_templates).format(
        scheme=random.choice(schemes),
        domain=random.choice(domains),
        doc=random.choice(docs),
        governing_body=random.choice(governing_bodies),
        demographic=random.choice(demographics)
    )
    dataset.append({"text": text, "label": 0})

for _ in range(300):
    text = random.choice(fake_templates).format(
        scheme=random.choice(schemes),
        sus_domain=random.choice(sus_domains),
        fee=random.choice(fake_fees),
        offer=random.choice(fake_offers)
    )
    dataset.append({"text": text, "label": 1})

# Shuffle dataset
random.shuffle(dataset)

df = pd.DataFrame(dataset)
os.makedirs('ml_pipeline', exist_ok=True)
df.to_csv("ml_pipeline/schemes_dataset.csv", index=False)
print("Dataset generated successfully at ml_pipeline/schemes_dataset.csv")
