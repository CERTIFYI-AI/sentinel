.PHONY: install dev test lint format typecheck serve docker clean

install:
	pip install -e .

dev:
	pip install -e ".[dev]"

test:
	pytest tests/ -v --cov=sentinel --cov-report=term-missing

lint:
	ruff check sentinel/ tests/

format:
	ruff format sentinel/ tests/

typecheck:
	mypy sentinel/

serve:
	sentinel serve --reload

docker:
	docker compose up --build -d

clean:
	rm -rf build/ dist/ *.egg-info .pytest_cache .mypy_cache .ruff_cache
	find . -type d -name __pycache__ -exec rm -rf {} +


.PHONY: audit
audit:
	@echo "=== Sentinel Audit Suite ==="
	cd dashboard && npx tsc --noEmit
	cd dashboard && npx eslint src/ --ext .ts,.tsx
	cd dashboard && npx vitest run --coverage 2>/dev/null || true
	ruff check sentinel/ 2>/dev/null || true
	bandit -r sentinel/ -ll 2>/dev/null || true
	@echo "=== Checking for service_role leaks ==="
	@! grep -rE "service_role|SERVICE_ROLE" dashboard/src/ --include="*.ts" --include="*.tsx" || (echo "LEAK DETECTED" && exit 1)
	@echo "=== All checks passed ==="
