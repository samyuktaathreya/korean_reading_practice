# run : uvicorn main:app --host 0.0.0.0 --port 8000 --reload
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 1. Import your database engine and Base to initialize tables
from database import engine, Base

# 2. Import the actual 'router' objects from your route files
from routes.unorganized_routes import router as unorganized_router
from routes.duolingo_routes import router as duolingo_router

# 3. Create database tables automatically on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

# Add Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace "*" with your specific GitHub URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files (with a check to prevent crashes if the folder isn't made yet)
if os.path.exists("../frontend/public"):
    app.mount("/api/static", StaticFiles(directory="../frontend/public"), name="static")
else:
    print("Warning: ../frontend/public directory not found. Static files bypassed.")

# 4. Include the router objects
app.include_router(unorganized_router)
app.include_router(duolingo_router)

@app.get("/")
def root():
    return {"message": "Server is running!"}