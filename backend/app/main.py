from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
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
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connections: Dict[str, WebSocket] = {}

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

class RouteRequest(BaseModel):
    starting_artist: Artist
    ending_artist: Artist
    websocket_id: str

@app.post("/routes/find")
async def fetch_route(route_request: RouteRequest, send_full_graph=True, db: Session=Depends(get_db)) -> RouteReply:
    
    startingArtist = route_request.starting_artist
    endingArtist = route_request.ending_artist
    websocket_id = route_request.websocket_id
    
    ws_connection = connections[websocket_id]
    route_reply: RouteReply = await find_route(startingArtist, endingArtist, ws_connection, db, send_full_graph=send_full_graph)
    if route_reply.route_list == []:
        raise HTTPException(status_code=404, detail="No route found between the specified artists. Potential closed loop chosen for starting or ending artist.")
    
    print(f"route = [{', '.join([artist.name for artist in route_reply.route_list])}]")
    return {"route_list": remove_connections(route_reply.route_list), 
            "graph": route_reply.graph if send_full_graph else None}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    connections[client_id] = websocket
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if necessary
            print(f"Received message: {data}")
    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected")
        del connections[client_id]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
