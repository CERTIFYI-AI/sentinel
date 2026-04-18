import re

# All 35 templates matching the DB seed
templates = [
  (1, 'AI Policy', 'ISO/IEC 42001', 'Clause 5.2', 'AI Management', 'High', 'Draft', '2026-04-19'),
  (2, 'AI System Acceptable Use Policy', 'ISO/IEC 42001', 'Clause 5.3', 'Acceptable Use', 'Medium', 'Draft', '2026-04-19'),
  (3, 'AI Risk Management Methodology', 'ISO/IEC 42001', 'Clause 6.1', 'Risk Management', 'High', 'Draft', '2026-04-19'),
  (4, 'AI System Impact Assessment Process', 'ISO/IEC 42001', 'Clause 6.2', 'Impact Assessment', 'High', 'Draft', '2026-04-19'),
  (5, 'Data Quality Management Procedure', 'ISO/IEC 42001', 'Clause 7.4', 'Data Quality', 'Medium', 'Draft', '2026-04-19'),
  (6, 'AI Incident Response Procedure', 'ISO/IEC 42001', 'Clause 10.1', 'Incident Management', 'Critical', 'Draft', '2026-04-19'),
  (7, 'AI Supplier Management Procedure', 'ISO/IEC 42001', 'Annex B.7', 'Third Party', 'High', 'Draft', '2026-04-19'),
  (8, 'Quality Management System (QMS) Policy', 'EU AI Act', 'Article 17', 'Quality Management', 'High', 'Draft', '2026-04-19'),
  (9, 'Risk Management System Policy', 'EU AI Act', 'Article 9', 'Risk Management', 'Critical', 'Draft', '2026-04-19'),
  (10, 'Technical Documentation Policy', 'EU AI Act', 'Article 11', 'Documentation', 'High', 'Draft', '2026-04-19'),
  (11, 'Copyright Compliance Policy (GPAI)', 'EU AI Act', 'Article 53', 'Copyright', 'Medium', 'Draft', '2026-04-19'),
  (12, 'Fundamental Rights Impact Assessment (FRIA) Policy', 'EU AI Act', 'Article 27', 'Fundamental Rights', 'Critical', 'Draft', '2026-04-19'),
  (13, 'AI Governance Policy (GOVERN)', 'NIST AI RMF', 'GOVERN', 'Governance', 'High', 'Draft', '2026-04-19'),
  (14, 'Risk Tolerance & Prioritization Policy', 'NIST AI RMF', 'GOVERN 5', 'Risk Management', 'High', 'Draft', '2026-04-19'),
  (15, 'Human-AI Interaction Policy', 'NIST AI RMF', 'MEASURE 3', 'Human Oversight', 'High', 'Draft', '2026-04-19'),
  (16, 'Workforce AI Training Policy', 'NIST AI RMF', 'GOVERN 4', 'Training', 'Medium', 'Draft', '2026-04-19'),
  (17, 'Internal Governance Structure Policy', 'Singapore Model AI', 'Section 2', 'Governance', 'High', 'Draft', '2026-04-19'),
  (18, 'Operations Management Policy', 'Singapore Model AI', 'Section 3', 'Operations', 'Medium', 'Draft', '2026-04-19'),
  (19, 'Customer Communication Policy', 'Singapore Model AI', 'Section 4', 'Communication', 'Medium', 'Draft', '2026-04-19'),
  (20, 'Agentic AI Limits Policy (2026)', 'Singapore Model AI', 'Section 5', 'Agentic AI', 'High', 'Draft', '2026-04-19'),
  (21, 'Automated Decision-Making (ADM) Policy', 'GDPR', 'Article 22', 'Automated Decisions', 'Critical', 'Draft', '2026-04-19'),
  (22, 'Privacy by Design Policy', 'GDPR', 'Article 25', 'Privacy', 'High', 'Draft', '2026-04-19'),
  (23, 'Data Protection Impact Assessment (DPIA) Policy', 'GDPR', 'Article 35', 'Impact Assessment', 'Critical', 'Draft', '2026-04-19'),
  (24, 'Secure AI Development Policy', 'OWASP LLM Top 10', 'LLM01-LLM10', 'Security', 'High', 'Draft', '2026-04-19'),
  (25, 'AI Data Leakage Prevention (DLP) Policy', 'OWASP LLM Top 10', 'LLM06', 'Data Protection', 'High', 'Draft', '2026-04-19'),
  (26, 'AI Supply Chain Security Policy', 'Google SAIF', 'SAIF 10', 'Supply Chain', 'High', 'Draft', '2026-04-19'),
  (27, 'Red Teaming & Adversarial Testing Policy', 'Google SAIF', 'SAIF 5', 'Security Testing', 'High', 'Draft', '2026-04-19'),
  (28, 'Responsible Stewardship Policy', 'OECD AI Principles', 'Principle 1.2', 'Stewardship', 'Medium', 'Draft', '2026-04-19'),
  (29, 'Transparency and Explainability Policy', 'OECD AI Principles', 'Principle 1.3', 'Transparency', 'High', 'Draft', '2026-04-19'),
  (30, 'Ethical Governance Policy', 'UNESCO Ethics of AI', 'Area 4', 'Ethics', 'High', 'Draft', '2026-04-19'),
  (31, 'Environmental Sustainability Policy', 'UNESCO Ethics of AI', 'Area 10', 'Sustainability', 'Medium', 'Draft', '2026-04-19'),
  (32, 'Threat Modeling Policy', 'MITRE ATLAS', 'AML.T0000-T0039', 'Threat Intelligence', 'High', 'Draft', '2026-04-19'),
  (33, 'Adversarial Defense Policy', 'MITRE ATLAS', 'AML.T0004', 'Adversarial Defense', 'Critical', 'Draft', '2026-04-19'),
  (34, 'Master AI Governance Policy', 'Cross-Framework', 'All', 'Master Governance', 'Critical', 'Draft', '2026-04-19'),
  (35, 'AI Change Management Policy', 'Cross-Framework', 'All', 'Change Management', 'High', 'Draft', '2026-04-19'),
]

lines = []
for t in templates:
    tid, name, fw, article, cat, risk, status, date = t
    desc = f'Editable template for {name.lower()} mapped to {fw}.'
    lines.append(f"  {{ id: {tid}, name: '{name}', framework: '{fw}', article: '{article}', category: '{cat}', risk_level: '{risk}', status: '{status}', used_by: 0, last_updated: '{date}', description: '{desc}' }}")

templates_str = 'const TEMPLATES = [\n' + ',\n'.join(lines) + '\n]'

with open('dashboard/src/pages/PolicyTemplates.tsx') as f:
    content = f.read()

# Replace the TEMPLATES array
pattern = r'const TEMPLATES = \[.*?\]'
new_content = re.sub(pattern, templates_str, content, flags=re.DOTALL)

# Also update the header count
new_content = new_content.replace('12 templates across', '35 templates across')

with open('dashboard/src/pages/PolicyTemplates.tsx', 'w') as f:
    f.write(new_content)

print(f'Updated PolicyTemplates.tsx with {len(templates)} templates')
