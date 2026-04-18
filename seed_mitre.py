import json, subprocess

SB_URL = 'https://vhparvughsygyknblkzt.supabase.co'
with open('dashboard/.env') as f:
    for line in f:
        if 'VITE_SUPABASE_ANON_KEY=' in line:
            SB_KEY = line.strip().split('=',1)[1]

# Get FW-010 ID
result = subprocess.run(['curl','-s',f'{SB_URL}/rest/v1/frameworks?code=eq.FW-010&select=id',
    '-H',f'apikey: {SB_KEY}','-H',f'Authorization: Bearer {SB_KEY}'],capture_output=True,text=True)
fw_id = json.loads(result.stdout)[0]['id']

# MITRE ATLAS controls - 40 controls across key technique categories
controls = [
    ('AML.T0000','ML Model Access','Adversary gains access to ML model for inference or manipulation.'),
    ('AML.T0001','ML Supply Chain Compromise','Compromise of ML supply chain components.'),
    ('AML.T0002','Backdoor ML Model','Insert backdoor into ML model during training.'),
    ('AML.T0003','Adversarial Data Poisoning','Corrupt training data to influence model behavior.'),
    ('AML.T0004','Model Evasion','Craft inputs to cause model misclassification.'),
    ('AML.T0005','Model Inversion','Extract training data from model outputs.'),
    ('AML.T0006','Membership Inference','Determine if data was used in model training.'),
    ('AML.T0007','Model Theft','Steal or replicate ML model parameters.'),
    ('AML.T0008','Model Extraction','Extract model functionality through queries.'),
    ('AML.T0009','Data Collection','Collect data for ML attack preparation.'),
    ('AML.T0010','ML Model Fingerprinting','Identify ML model type and architecture.'),
    ('AML.T0011','Adversarial Example Transfer','Transfer adversarial examples between models.'),
    ('AML.T0012','Physical Adversarial Examples','Create physical objects that fool ML models.'),
    ('AML.T0013','Prompt Injection','Inject malicious prompts into LLM systems.'),
    ('AML.T0014','Indirect Prompt Injection','Embed prompts in external data sources.'),
    ('AML.T0015','Data Exfiltration via ML','Use ML systems to exfiltrate sensitive data.'),
    ('AML.T0016','Exploit Public ML APIs','Abuse publicly available ML API endpoints.'),
    ('AML.T0017','ML Denial of Service','Overwhelm ML systems to deny service.'),
    ('AML.T0018','Training Data Extraction','Extract memorized training data from models.'),
    ('AML.T0019','Model Watermark Removal','Remove watermarks from stolen ML models.'),
    ('AML.T0020','Concept Drift Exploitation','Exploit model degradation over time.'),
    ('AML.T0021','Federated Learning Attack','Attack federated learning aggregation.'),
    ('AML.T0022','Reinforcement Learning Manipulation','Manipulate RL reward signals.'),
    ('AML.T0023','Transfer Learning Attack','Attack fine-tuned models via base model.'),
    ('AML.T0024','Model Serialization Attack','Exploit model serialization vulnerabilities.'),
    ('AML.T0025','GPU Side-Channel Attack','Extract model info via GPU side channels.'),
    ('AML.T0026','Data Augmentation Poisoning','Poison augmented training data pipelines.'),
    ('AML.T0027','Label Flipping','Flip labels in training data to corrupt model.'),
    ('AML.T0028','Feature Space Manipulation','Manipulate input feature representations.'),
    ('AML.T0029','Gradient Leakage','Extract private data from shared gradients.'),
    ('AML.T0030','Model API Abuse','Abuse model serving APIs for reconnaissance.'),
    ('AML.T0031','ML Pipeline Tampering','Tamper with ML training or serving pipelines.'),
    ('AML.T0032','Synthetic Data Poisoning','Corrupt synthetic data generation processes.'),
    ('AML.T0033','Model Trojan','Insert trojans triggered by specific inputs.'),
    ('AML.T0034','Adversarial Patch','Apply patches that fool computer vision models.'),
    ('AML.T0035','Sponge Example Attack','Craft inputs that maximize inference cost.'),
    ('AML.T0036','Model Reprogramming','Repurpose ML model for unauthorized tasks.'),
    ('AML.T0037','AI System Reconnaissance','Gather information about target AI systems.'),
    ('AML.T0038','ML Metadata Exploitation','Exploit ML model metadata and configurations.'),
    ('AML.T0039','Autonomous System Manipulation','Manipulate autonomous AI decision systems.'),
]

rows = [{'framework_id':fw_id,'control_ref':c[0],'name':c[1],'description':c[2],'severity':'Medium'} for c in controls]
result = subprocess.run(['curl','-s','-X','POST',f'{SB_URL}/rest/v1/controls',
    '-H',f'apikey: {SB_KEY}','-H',f'Authorization: Bearer {SB_KEY}',
    '-H','Content-Type: application/json','-H','Prefer: resolution=merge-duplicates',
    '-d',json.dumps(rows)],capture_output=True,text=True)
if 'error' not in result.stdout.lower() or result.stdout == '':
    print(f'MITRE ATLAS: {len(rows)} controls OK')
else:
    print(f'ERROR: {result.stdout[:300]}')
