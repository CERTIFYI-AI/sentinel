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
