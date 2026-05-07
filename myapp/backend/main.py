# run : uvicorn main:app --host 0.0.0.0 --port 8000 --reload
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Import the router from your new routes.py file
from routes import unorganized_routes
from routes import duolingo_routes

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

# Add Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your specific GitHub URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files
app.mount("/api/static", StaticFiles(directory="../frontend/public"), name="static")

# Include all the routes from routes.py
app.include_router(unorganized_routes)
app.include_router(duolingo_routes)