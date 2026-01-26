.PHONY: lint test format

lint:
	python -m ruff check app
	python -m black --check app

test:
	python -m pytest

format:
	python -m ruff check --fix app
	python -m black app
