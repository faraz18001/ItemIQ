.PHONY: install db upgrade seed run test lint format frontend frontend-build

PY := ../virtual/bin/python
B := backend

install:
	cd $(B) && $(PY) -m pip install -r requirements-dev.txt

db:
	cd $(B) && $(PY) -c "from app.database import Base, engine; import app.models; Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine); print('db reset')"

upgrade:
	cd $(B) && $(PY) -m alembic upgrade head

seed:
	cd $(B) && $(PY) -m seed.seed --reset

run:
	cd $(B) && $(PY) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

api: run

test:
	cd $(B) && PYTHONPATH=. $(PY) -m pytest -q

lint:
	cd $(B) && $(PY) -m ruff check app seed tests

format:
	cd $(B) && $(PY) -m ruff check app seed tests --fix
	cd $(B) && $(PY) -m ruff format app seed tests

frontend:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build
