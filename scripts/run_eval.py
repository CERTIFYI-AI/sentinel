#!/usr/bin/env python3
"""Run the Sentinel truth regression test suite against a labeled dataset.

Dataset format (JSONL):
    {"prompt": "...", "response": "...", "label": true/false}
    where label=true means the response is factually accurate.

Metrics computed:
    - Hallucination detection rate (% of false labels correctly blocked)
    - False positive rate (% of true labels incorrectly blocked)
    - Mean trust score by label
    - Latency breakdown: sanitization / verification / total
    - Cost analysis: total / per-request / projected monthly at 100k req

Exit code 1 if hallucination detection rate < 80% (CI gate).

Usage:
    python scripts/run_eval.py --dataset data/eval_dataset.jsonl
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from sentinel.config import load_config
from sentinel.layers.sanitizer import sanitize
from sentinel.layers.verifier import verify

console = Console()
app = typer.Typer(help="Evaluate Sentinel on a labeled truth dataset.")

# CI gate threshold: fail the build if we detect fewer than 80% of hallucinations.
MIN_HALLUCINATION_DETECTION_RATE = 0.80


@app.command()
def evaluate(
    dataset: Path = typer.Option(..., "--dataset", help="Path to JSONL eval dataset."),
    config_path: Path = typer.Option("configs/sentinel.yaml", "--config", help="Sentinel config."),
    threshold: float = typer.Option(0.85, "--threshold", help="Trust score blocking threshold."),
) -> None:
    """Run evaluation and print metrics as a Rich table."""
    config = load_config(config_path)

    entries = []
    with dataset.open() as f:
        for line in f:
            entries.append(json.loads(line))

    if not entries:
        console.print("[red]Empty dataset.[/red]")
        raise typer.Exit(code=1)

    async def _run():
        results = []
        for entry in entries:
            prompt = entry["prompt"]
            response = entry["response"]
            label = entry["label"]  # True = factual, False = hallucination

            t0 = time.perf_counter()
            san_result = await sanitize(prompt, config)
            t_san = (time.perf_counter() - t0) * 1000

            t1 = time.perf_counter()
            ver_result = await verify(response, config)
            t_ver = (time.perf_counter() - t1) * 1000

            blocked = ver_result.trust_score < threshold
            results.append({
                "label": label,
                "trust_score": ver_result.trust_score,
                "blocked": blocked,
                "sanitize_ms": t_san,
                "verify_ms": t_ver,
                "total_ms": t_san + t_ver,
                "cost_usd": ver_result.cost_usd,
            })

        # Compute metrics.
        true_entries = [r for r in results if r["label"]]
        false_entries = [r for r in results if not r["label"]]

        halluc_detected = sum(1 for r in false_entries if r["blocked"])
        halluc_rate = halluc_detected / len(false_entries) if false_entries else 0.0

        false_positives = sum(1 for r in true_entries if r["blocked"])
        fp_rate = false_positives / len(true_entries) if true_entries else 0.0

        mean_score_true = sum(r["trust_score"] for r in true_entries) / len(true_entries) if true_entries else 0.0
        mean_score_false = sum(r["trust_score"] for r in false_entries) / len(false_entries) if false_entries else 0.0

        mean_san_ms = sum(r["sanitize_ms"] for r in results) / len(results)
        mean_ver_ms = sum(r["verify_ms"] for r in results) / len(results)
        mean_total_ms = sum(r["total_ms"] for r in results) / len(results)

        total_cost = sum(r["cost_usd"] for r in results)
        cost_per_req = total_cost / len(results)
        projected_monthly = cost_per_req * 100_000

        # Print Rich table.
        table = Table(title="Sentinel Evaluation Results", show_header=True)
        table.add_column("Metric", style="bold")
        table.add_column("Value", justify="right")

        table.add_row("Dataset size", str(len(results)))
        table.add_row("True labels", str(len(true_entries)))
        table.add_row("False labels (hallucinations)", str(len(false_entries)))
        table.add_row("---", "---")
        table.add_row("Hallucination detection rate", f"{halluc_rate:.1%}")
        table.add_row("False positive rate", f"{fp_rate:.1%}")
        table.add_row("Mean trust score (true)", f"{mean_score_true:.4f}")
        table.add_row("Mean trust score (false)", f"{mean_score_false:.4f}")
        table.add_row("---", "---")
        table.add_row("Mean sanitization latency", f"{mean_san_ms:.1f} ms")
        table.add_row("Mean verification latency", f"{mean_ver_ms:.1f} ms")
        table.add_row("Mean total latency", f"{mean_total_ms:.1f} ms")
        table.add_row("---", "---")
        table.add_row("Total cost", f"${total_cost:.4f}")
        table.add_row("Cost per request", f"${cost_per_req:.6f}")
        table.add_row("Projected monthly (100k req)", f"${projected_monthly:.2f}")

        console.print(table)

        # CI gate.
        if halluc_rate < MIN_HALLUCINATION_DETECTION_RATE:
            console.print(
                f"\n[bold red]FAIL:[/bold red] Hallucination detection rate "
                f"{halluc_rate:.1%} < {MIN_HALLUCINATION_DETECTION_RATE:.0%} minimum."
            )
            sys.exit(1)
        else:
            console.print(f"\n[bold green]PASS:[/bold green] Detection rate {halluc_rate:.1%}")

    asyncio.run(_run())


if __name__ == "__main__":
    app()
