from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .models import Base, engine
from .spotify_service import *
from cachetools import TTLCache
import pytz
import asyncio

app = FastAPI()

# when inside backend folder
# .\venv\Scripts\activate
# uvicorn app.main:app --reload

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://cst.dev/sam", 
        "https://cst.dev/sam",
        "ws://cst.dev/sam", 
        "wss://cst.dev/sam",
        "127.0.0.1",  # for nginx websocket proxy purposes 
    ], # covering all the bases, best squash that error
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connections: Dict[str, WebSocket] = {}
ws_cache = TTLCache(maxsize=1000, ttl=600)

# Function to add a WebSocket connection to the cache
def add_ws_connection(client_id, websocket):
    connections[client_id] = websocket
    ws_cache[client_id] = {
        'connection': websocket,
        'added_at': datetime.now()
    }
    print(f"WebSocket connection for {client_id} added to cache. ")
    print(f"Current connections: {list(connections.keys())}. Current Cached: {list(ws_cache.keys())}")

# Function to retrieve a WebSocket connection from the cache
def get_ws_connection(client_id):
    if client_id in connections:
        print(f"Found connection for {client_id} in connections.")
        return connections[client_id]
    elif client_id in ws_cache:
        print(f"Found connection for {client_id} in cache.")
        return ws_cache[client_id]['connection']
    else:
        print(f"No active connection for {client_id} found in cache.")
        return None

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
async def fetch_route(route_request: RouteRequest, send_full_graph=True, db: Session=Depends(get_db), require_ws_connection=True) -> RouteReply:
    
    startingArtist = route_request.starting_artist
    endingArtist = route_request.ending_artist
    websocket_id = route_request.websocket_id
    
    ws_connection = get_ws_connection(websocket_id)
    if require_ws_connection and ws_connection == None: 
        raise HTTPException(status_code=440, detail="No WS Connection found, reestablish connection")

    route_reply: RouteReply = await find_route(startingArtist, endingArtist, ws_connection, db, send_full_graph=send_full_graph)
    if route_reply.route_list == []:
        raise HTTPException(status_code=404, detail="No route found between the specified artists. Potential closed loop chosen for starting or ending artist.")
    
    print(f"route = [{', '.join([artist.name for artist in route_reply.route_list])}]")
    return {"route_list": remove_connections(route_reply.route_list), 
            "graph": route_reply.graph if send_full_graph else None}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    
    add_ws_connection(client_id, websocket)
    
    connection = get_ws_connection(client_id)
    print(f"ClientID: {client_id}. Current connections: {list(connections.keys())}. Current Cached: {list(ws_cache.keys())}")
    
    await connection.send_text(json.dumps({"message": "Websocket Connection Finalised, You can now find a route", 
                                              "websocket_id": f"{client_id}",
                                              "update_type": "connection_status"}))
    
    async def ping():
        while True:
            try:
                await websocket.send_text(json.dumps({"message": "ping", "websocket_id": client_id, "update_type": "ping"}))
                await asyncio.sleep(5) 
            except Exception as e:
                print(f"Error in ping task: {e}")
                break

    ping_task = asyncio.create_task(ping())
    
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if necessary
            print(f"Received message from {client_id}: {data}")
    except WebSocketDisconnect:
        print(f"Client {client_id} disconnected")
        del connections[client_id]
        ping_task.cancel()
        print(f"Client {client_id} removed from connections. Current connections: {list(connections.keys())}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# TODO: 
# Make a Cache of the WebSocket Information that stuff is saved in for 10 minutes, then if the connection errors as its got no information it can grab it from the cache, I assume it will work.
    # Fix issue with trying to access null element if connections[client_id]