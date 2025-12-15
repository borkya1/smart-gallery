.PHONY: install run-backend run-frontend deploy

install:
	cd backend && python3 -m pip install -q -r requirements.txt
	cd frontend && npm install --silent

run-backend:
	cd backend && python3 -m uvicorn main:app --reload

run-frontend:
	cd frontend && npm run dev

deploy:
	./deploy.sh
