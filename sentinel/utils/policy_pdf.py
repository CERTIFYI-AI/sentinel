"""Generates policy PDFs."""
import io


def generate_policy_pdf(policy: dict) -> bytes:
    """Return a simple text-based PDF placeholder."""
    title = policy.get("title", "Policy Document")
    body = policy.get("body", "")
    content = title + "\n\n" + body
    return content.encode("utf-8")
