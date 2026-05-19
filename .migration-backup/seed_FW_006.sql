INSERT INTO controls (framework_id, control_ref, name, description, severity)
SELECT f.id, v.ref, v.name, v.desc, v.sev FROM frameworks f,
(VALUES
('Prin 1.1','Inclusive Growth','Ensure AI contributes to inclusive growth and sustainable development.','Medium'),
('Prin 1.2','Well-Being Enhancement','Design AI to enhance individual and societal well-being.','Medium'),
('Prin 2.1','Human-Centred Values','Embed human-centred values in AI systems.','Medium'),
('Prin 2.2','Fairness & Non-Discrimination','Prevent unfair discrimination by AI systems.','Medium'),
('Prin 3.1','Transparency & Explainability','Ensure transparency in AI system operations.','Medium'),
('Prin 3.2','Meaningful Information Disclosure','Disclose meaningful information about AI systems.','Medium'),
('Prin 4.1','Robustness & Safety','Ensure AI systems are robust and safe.','Medium'),
('Prin 4.2','Security & Privacy','Protect security and privacy in AI systems.','Medium'),
('Prin 4.3','Risk Management','Manage risks throughout AI system lifecycle.','Medium'),
('Prin 5.1','Accountability','Ensure accountability for AI system outcomes.','Medium'),
('Prin 5.2','Responsible Stewardship','Practice responsible stewardship of AI.','Medium'),
('Rec 1.1','Investment in AI Research','Invest in AI research and development.','Medium'),
('Rec 2.1','Digital Ecosystem for AI','Foster a digital ecosystem for trustworthy AI.','Medium'),
('Rec 3.1','AI Policy Environment','Shape an enabling policy environment for AI.','Medium'),
('Rec 4.1','Building Human Capacity','Build human capacity for AI adoption.','Medium'),
('Rec 5.1','International Cooperation','Promote international cooperation on AI governance.','Medium'),
('Prin 2.3','Stakeholder Participation','Enable stakeholder participation in AI governance.','Medium'),
('Prin 1.3','Environmental Impact','Consider environmental impact of AI systems.','Medium'),
('Prin 1.4','Digital Inclusion','Promote digital inclusion through AI.','Medium'),
('Rec 1.2','Innovation Promotion','Promote AI innovation while managing risks.','Medium'),
('Rec 2.2','Data Access & Sharing','Enable responsible data access and sharing for AI.','Medium'),
('Rec 4.2','Workforce Transition','Support workforce transition in AI era.','Medium'),
('Rec 3.2','Multi-Stakeholder Governance','Implement multi-stakeholder AI governance.','Medium'),
('Rec 3.3','Regulatory Frameworks','Develop appropriate regulatory frameworks for AI.','Medium'),
('Rec 2.3','Trustworthy AI Standards','Develop standards for trustworthy AI.','Medium')
) AS v(ref, name, desc, sev)
WHERE f.code='FW-006'
ON CONFLICT (framework_id, control_ref) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description;
