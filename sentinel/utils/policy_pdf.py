import io, markdown
from datetime import date
from typing import Optional

async def generate_policy_pdf(policy: dict) -> bytes:
    try:
        from weasyprint import HTML, CSS
        html = _build_html(policy)
        pdf_bytes = HTML(string=html).write_pdf(stylesheets=[CSS(string=_css())])
        return pdf_bytes
    except ImportError:
        return _reportlab_fallback(policy)

def _build_html(policy: dict) -> str:
    title = policy.get('title','Policy')
    framework = policy.get('framework','')
    version = policy.get('version','1.0.0')
    effective = policy.get('effective_date') or date.today()
    approved_by = policy.get('approved_by','—')
    status = policy.get('status','DRAFT')
    body_md = policy.get('body','')
    body_html = markdown.markdown(body_md, extensions=['tables','toc'])
    sigs = policy.get('signatures') or []
    watermark = "<div class='watermark'>DRAFT</div>" if status == 'DRAFT' else ''
    sig_rows = ''.join(f"<tr><td>{s.get('user_name','')}</td><td>{s.get('user_email','')}</td><td>{s.get('signed_at','')}</td><td>{s.get('signature_method','')}</td></tr>" for s in sigs if isinstance(s,dict))
    sig_block = f"<h2>Signatures</h2><table><thead><tr><th>Name</th><th>Email</th><th>Date</th><th>Method</th></tr></thead><tbody>{sig_rows}</tbody></table>" if sigs else ''
<html><head><meta charset=utf-8><title>{title}</title></head><body>
{watermark}
<div class=cover>
  <div class=logo>Certifyi Sentinel</div>
  <div class=fw-badge>{framework}</div>
  <h1>{title}</h1>
  <table class=meta><tr><td>Version</td><td>v{version}</td></tr>
  <tr><td>Effective Date</td><td>{effective}</td></tr>
  <tr><td>Approved By</td><td>{approved_by}</td></tr>
  <tr><td>Classification</td><td>INTERNAL</td></tr></table>
</div>
<div class=body>{body_html}</div>
{sig_block}
</body></html>"""

def _css():
    return """
body { font-family: Outfit, sans-serif; font-size: 11pt; color: #1a1a2e; margin: 2cm; }
.cover { text-align: center; page-break-after: always; padding: 4cm 0; }
.logo { font-size: 18pt; font-weight: 700; color: #6c63ff; margin-bottom: 1cm; }
.fw-badge { display: inline-block; background: #ede9fe; color: #5b21b6; padding: 4px 12px; border-radius: 12px; font-size: 9pt; margin-bottom: 1cm; }
h1 { font-size: 22pt; margin: 0.5cm 0; }
.meta { margin: 1cm auto; border-collapse: collapse; }
.meta td { padding: 4px 12px; border: 1px solid #e5e7eb; }
h2 { color: #6c63ff; border-bottom: 2px solid #ede9fe; padding-bottom: 4px; }
table { width: 100%; border-collapse: collapse; margin: 1em 0; }
th { background: #f5f3ff; color: #5b21b6; padding: 8px; text-align: left; }
td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
.watermark { position: fixed; top: 40%; left: 10%; font-size: 80pt; color: rgba(200,0,0,0.1); transform: rotate(-45deg); z-index: -1; font-weight: 900; }
@page { margin: 2cm; @bottom-center { content: counter(page) " of " counter(pages); } }
"""

def _reportlab_fallback(policy: dict) -> bytes:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    c.setFont('Helvetica-Bold', 18)
    c.drawString(72, h-72, policy.get('title','Policy'))
    c.setFont('Helvetica', 11)
    c.drawString(72, h-100, f"Version: {policy.get('version','1.0.0')} | Framework: {policy.get('framework','')} | INTERNAL")
    body = policy.get('body','').replace('
','
')
    y = h - 140
    for line in body[:3000].split('
'):
        if y < 72: c.showPage(); y = h - 72
        c.drawString(72, y, line[:90])
        y -= 14
    c.save()
    return buf.getvalue()
