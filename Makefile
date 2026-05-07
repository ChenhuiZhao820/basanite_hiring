.PHONY: install-dev test test-cov web-test web-test-cov ci

install-dev:
	pip install -r requirements-dev.txt
	cd web && npm install

test:
	python -m pytest -q

test-cov:
	python -m coverage run -m pytest -q
	python -m coverage report
	python -m coverage html -d coverage_html

web-test:
	cd web && npm test

web-test-cov:
	cd web && npm run test:cov

ci: test web-test
