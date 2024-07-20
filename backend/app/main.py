from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .models import Base, engine
from .spotify_service import *
import pytz

app = FastAPI()

# when inside backend folder
# .\venv\Scripts\activate
# uvicorn app.main:app --reload

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # List of allowed origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

@app.on_event("startup")
def startup_event():
    # Base.metadata.create_all(bind=engine)
    refresh_access_token()

@app.get("/api")
def read_root():
    return {"message": "Hello from FastAPI"}

@app.get("/artist/search")
def search_artists(artist_name: str, max_results: int = 10):
    return get_artist(artist_name, max_results)

@app.get("/artist/{spotify_id}/albums")
def fetch_artist_albums(spotify_id: str, all_albums: bool = False):
    return get_artist_albums(spotify_id, all_albums)

@app.post("/routes/find")
def fetch_route(startingArtist: Artist, endingArtist: Artist, db: Session=Depends(get_db)):
    route = find_route(startingArtist, endingArtist, db)
    print(f"route = [{', '.join([artist.name for artist in route])}]")
    return remove_connections(route)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
