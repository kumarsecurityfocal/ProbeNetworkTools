from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, diagnostics, api_keys
from app.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProbeOps API",
    description="API for network diagnostics and operations",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(diagnostics.router, tags=["Diagnostics"])
app.include_router(api_keys.router, tags=["API Keys"])

@app.get("/", tags=["Root"])
async def root():
    return {"message": "Welcome to ProbeOps API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
