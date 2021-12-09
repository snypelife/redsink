.PHONY: test coverage

.DEFAULT_GOAL := help

help:
	@echo 'Available commands:'
	@echo 'test: Runs the test suite'
	@echo 'lint: Lint files to ensure they match conventions'
	@echo 'coverage: See code coverage report'

install:
	@echo 'Activating correct version of node...'
	nvm install
	@echo 'Installing node_modules...'
	npm i

test:
	@echo 'Running tests...'
	npm t

lint:
	@echo 'Linting files...'
	npm run lint

coverage:
	@echo 'Opening coverage report...'
	npm run cov

