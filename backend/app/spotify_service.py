import os
import time
import json
from fastapi import WebSocket
from queue import Queue
from datetime import datetime, timedelta
from typing import List, Tuple
import requests
import pytz
from fastapi import HTTPException, Depends
from .db_service import *


from .dtos import *

# Environment variables for client ID and secret
CLIENT_ID = os.getenv("SLW_SPOTIFY_ID")
CLIENT_SECRET = os.getenv("SLW_SPOTIFY_SECRET")

# Spotify URLs
TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1"
ARTIST_URL = f"{SPOTIFY_API_BASE_URL}/artists"
SEARCH_URL = f"{SPOTIFY_API_BASE_URL}/search"

# Global variables
access_token = None
expiry_time = -1
api_call_times = Queue()
RATE_LIMIT = 90  # Example limit, adjust as necessary

def get_spotify_headers():
    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "Content-Type": "application/json"
    }
    return headers

def get_access_token():
    global access_token, expiry_time
    if access_token is None or datetime.now(pytz.utc) > expiry_time:
        refresh_access_token()
    return access_token

def refresh_access_token():

    print(f"Refreshing access token")    
    global access_token, expiry_time
    response = requests.post(TOKEN_URL, {
        'grant_type': 'client_credentials'
    }, auth=(CLIENT_ID, CLIENT_SECRET))

    if response.status_code != 200:
        print(response.status_code)
        print(response.text)  # Print the response text for detailed error information
        raise HTTPException(status_code=response.status_code, detail="Error fetching access token")

    data = response.json()
    access_token = data['access_token']
    expiry_time = datetime.now(pytz.utc) + timedelta(seconds=data['expires_in'])


def check_rate_limit() -> Tuple[bool, int]: # returns if the call is expected to work and the ammount in the rolling window
    global api_call_times
    now = datetime.now(pytz.utc).timestamp()
    
    # Remove timestamps older than 30 seconds
    while not api_call_times.empty() and now - api_call_times.queue[0] > 30:
        api_call_times.get()

    # Check if within rate limit
    if api_call_times.qsize() < RATE_LIMIT:
        api_call_times.put(now)
        return (True, api_call_times.qsize())
    return (False, api_call_times.qsize())


def make_spotify_call(url: str, headers, params=None):
    while True:
        call_result : Tuple[bool, int] = check_rate_limit()
        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 429:  # 429 = rate limit exceeded.
            retry_after = int(response.headers.get("Retry-After", 1))  # 1 represents default value. shouldnt get activated
            print(f"Rate limit exceeded. Retrying after {retry_after} seconds. | rolling calls : {call_result[1]}, expected outcome was : {"True" if call_result[0] else "False"}")
            time.sleep(retry_after)
        else:
            response.raise_for_status()  # Catches other errors. cause im definately gonna run into one somehow.
            # print(f"Call successful. | rolling calls : {call_result[1]}, expected outcome was : {"True" if call_result[0] else "False"}") 
            return response

# DEPRECATED due to adjustments to image storage.
# def select_profile_picture(images: List[Image]) -> str:#
#     for image in images:
#         if image.width == 300:
#             return image.url
#     return images[0].url if images else "default"

def select_profile_picture(images: List[Dict]) -> str:
    image_objects = [Image(**image) for image in images]
    for image in image_objects:
        if image.width == 300:
            return image.url
    return image_objects[0].url if image_objects else "default"

def get_artist(artist_name: str, max_results: int) -> List[Artist]:

    artist_name = artist_name.strip().replace(' ', '+')
    url = f"{SEARCH_URL}?q={artist_name}&type=artist&limit={max_results}"
    headers = get_spotify_headers()
    response = make_spotify_call(url, headers)

    data = response.json()
    artist_search_response = ArtistSearchResponse(**data)
    
    artists = []
    for item in artist_search_response.artists.items:
        profile_picture_url = select_profile_picture(item.images)
        artist = Artist(
            id=item.id,
            artURL=profile_picture_url,
            followers=item.followers.total,
            name=item.name,
            popularity=item.popularity,
            lastUpdated=None,
            connections=[],  
            genres=item.genres
        )
        artists.append(artist)

    return artists


def get_artist_albums(spotify_id: str, all_albums: bool = False) -> List[Album]:
    

    url = f"{ARTIST_URL}/{spotify_id}/albums"
    headers = get_spotify_headers()
    params = {"limit": 50, "offset": 0, "include_groups": "single,appears_on,album"}
    album_ids = []

    while True:
        print(f"Finding albums {params['offset']} - {params['offset'] + params['limit']}")
        response = make_spotify_call(url, headers, params)

        data = response.json()
        print(f"total albums = {data['total']}")
        album_ids.extend([item['id'] for item in data['items']])

        if not all_albums or len(data['items']) < 50:
            break

        params['offset'] += 50

    # Fetch detailed information for all albums
    print(f"album_ids length = {len(set(album_ids))}")
    
    detailed_albums = get_detailed_album_info(album_ids)
    return detailed_albums

def get_detailed_album_info(album_ids: List[str]) -> List[Album]:
    
    headers = get_spotify_headers()
    all_albums = []

    # Calculate the number of iterations needed to process all album IDs in chunks of 20 (max the multiple albums API can handle)
    iteration_count = (len(album_ids) + 19) // 20  # Ceiling division

    for index in range(iteration_count):
        # Slice the album_ids list to get a chunk of up to 20 IDs
        ids_chunk = album_ids[index*20:(index+1)*20]
        ids_param = ','.join(ids_chunk)
        url = f"{SPOTIFY_API_BASE_URL}/albums?ids={ids_param}"

        
        print(f"Fetching detailed album information for albums {index*20} -> {(index+1)*20}. Total Albums: {len(album_ids)}")
        response = make_spotify_call(url, headers)
        if response.status_code != 200:
            try:
                detail = response.json()
            except requests.exceptions.JSONDecodeError:
                detail = response.text
            raise HTTPException(status_code=response.status_code, detail=detail)

        data = response.json()
        for album_data in data['albums']:
            if 'tracks' in album_data:
                for track_data in album_data['tracks']['items']:
                    if 'artists' in track_data:
                        track_data['artists'] = [TrackArtist(**artist) for artist in track_data['artists']]
                    track_data['is_playable'] = track_data.get('is_playable', None)
                    track_data['popularity'] = track_data.get('popularity', None)
                album_data['tracks'] = AlbumTracks(**album_data['tracks'])
            album = Album(**album_data)
            all_albums.append(album)

    return all_albums

def get_artists_from_album_list(albums: List[Album], original_artist: Artist) -> List[Artist]:
    unique_artists = set()

    for album in albums:
        for track in album.tracks.items:
            if any(artist.id == original_artist.id for artist in track.artists):
                for artist in track.artists:
                    if artist.id != original_artist.id:
                        temp_artist = Artist.from_track_artist(artist)
                        temp_artist.connections = []
                        unique_artists.add(temp_artist)
                        

    return list(unique_artists)


def get_connections(artist: Artist, db : Session = None) -> Artist:
    print(f"Finding connections for {artist.name}")
    if db:
        print(f"Checking db for up-to-date artist entry")
        artist = update_artist_with_db(db, artist)
    print(f"get_connections | connections length for {artist.name} : {len(artist.connections)}")
    if len(artist.connections) > 2: # and artist.lastUpdated.astimezone(pytz.utc) > datetime.now(pytz.utc) - timedelta(days=7) --> Add back in once lastUpdated is fixed
        print(f"Using Database Cached Connections")
        return artist.connections
    albums = get_artist_albums(artist.id, all_albums=True)
    artist.lastUpdated = datetime.now(pytz.utc)
    artist_list = get_artists_from_album_list(albums, artist)
    if artist_list is not None:
        return get_multiple_artists(artist_list)
    else:
        return None

def contains_artist(artist_list : List[Artist], artist : Artist):
    for a in artist_list:
        if a.id == artist.id:
            return True
    return False

def get_multiple_artists(artist_list: List[Artist]) -> List[Artist]:
    
    artist_ids = [artist.id for artist in artist_list]
    headers = get_spotify_headers()
    all_artists = []

    # Fetch in chunks of 50 (the maximum number of artists that can be fetched at once)
    # Need to see why the profile picture grabbing on this part doesnt work, (see gpt output for whats technically causing it)
    print(f"number of artists to get information on : {len(artist_ids)}")
    for i in range(0, len(artist_ids), 50):
        ids_chunk = artist_ids[i:i+50]
        end_artist_name = artist_list[i+50].name if i + 50 < len(artist_list) else artist_list[-1].name
        print(f"Fetching Detailed Artist Information for artists {i} ({(artist_list[i].name)}) -> {i+50} ({end_artist_name})")
        ids_param = ','.join(ids_chunk)
        url = f"{SPOTIFY_API_BASE_URL}/artists?ids={ids_param}"
        response = make_spotify_call(url, headers=headers)

        data = response.json()
        for item in data['artists']:
            profile_picture_url = select_profile_picture(item['images'])
            updated_artist = Artist(
                id=item['id'],
                artURL=profile_picture_url,
                followers=item['followers']['total'],
                name=item['name'],
                popularity=item['popularity'],
                lastUpdated=None,
                connections=[],  # does not get obtained through this anyway, so isnt even used below 
                genres=item.get('genres', [])
            )
            all_artists.append(updated_artist)
    # Update the original artist list with the new details
    for old_artist, new_artist in zip(artist_list, all_artists):
        old_artist.artURL = new_artist.artURL
        old_artist.followers = new_artist.followers
        old_artist.popularity = new_artist.popularity
        old_artist.genres = new_artist.genres
    return artist_list

# just made for utility, not currently used
def get_single_artist(artist: Artist) -> Artist:
    url = f"{SPOTIFY_API_BASE_URL}/artists/{artist.id}"
    headers = get_spotify_headers()
    response = make_spotify_call(url, headers)

    item = response.json()
    profile_picture_url = select_profile_picture(item['images'])
    artist.artURL = profile_picture_url
    artist.followers = item['followers']['total']
    artist.popularity = item['popularity']
    artist.genres = item.get('genres', [])
    
    return artist

# just made for utility, not currently used 
def get_single_artist_by_id(artist_id: str) -> Artist:
    
    url = f"{SPOTIFY_API_BASE_URL}/artists/{artist_id}"
    headers = get_spotify_headers()
    response = make_spotify_call(url, headers)
    item = response.json()
    profile_picture_url = select_profile_picture(item['images'])
    artist = Artist(
        id=item['id'],
        artURL=profile_picture_url,
        followers=item['followers']['total'],
        name=item['name'],
        popularity=item['popularity'],
        lastUpdated=None,
        connections=[],  # Initialize empty list
        genres=item.get('genres', []),
        genreDict={}  # Initialize empty dict
    )
    
    return artist


def sort_by_weight(unchecked_artists : List[Tuple[Artist, int, int, List[Artist]]], target_artist : Artist) -> List[Tuple[Artist, int, int]]:
    
    # Order by how many genres they share, and account for both popularity (higher the better) and their integer (lower is better)
    updated_artist_list = []
    # print(f"unchecked_artists[0] = {unchecked_artists[0]}")
    for artist, depth, weight, previous_connections in unchecked_artists:
        if weight == -1:
            # Calculates weight 
            weight = calculate_weight(artist, target_artist, depth)
        updated_artist_list.append((artist, depth, weight, previous_connections))

    # Sort by depth first (second element in tuple) and then by weight (third element in tuple)
    # TODO: This doesnt work, 
    sorted_artist_list = sorted(updated_artist_list, key=lambda x: (x[2], x[1], x[0].popularity))

    return sorted_artist_list

def calculate_weight(selected_artist : Artist, target_artist : Artist, depth : int) -> int:
    
    # calculate a weight, representing how likely (as a guess) they are to lead to the target artist. 
    # should be calculated as a number representing 
    # 1. how many genres they share (max 1 for if selectedArtist contains all genres of the targetArtist)
    # 2. their popularity score (scaling from 0.75 to 1 based on their popularity)
    # 3. depth from the starting artist (reducing by 0.15 for each depth (hoping that the six degrees of seperation applies and no more than 5 is ever needed))
    selected_genres = set(selected_artist.genres or [])
    target_genres = set(target_artist.genres or [])
    
    # Calculate shared genres weight
    if target_genres & selected_genres:
        shared_genres_ratio = len(selected_genres.intersection(target_genres)) / len(target_genres)
    elif target_genres:
        shared_genres_ratio = 0.75 # random value really, just so it has an effect, normally no genres probably means low popularity too. 
    else:
        shared_genres_ratio = 1 # due to target not having any genres, will not be relevant in calcuation. 
    popularity_weight = 0.75 + (0.25 * (selected_artist.popularity / 100))
    depth_penalty = max(0, 1 - (0.15 * depth))
    answer = shared_genres_ratio * popularity_weight * depth_penalty
    return answer

def check_if_complete(current_artist : Artist, checked_artists: List[Tuple[Artist, bool]], target_artist: Artist) -> List[Artist]:
    checked_artist_ids = {artist.id for artist, isConnectedToTarget in checked_artists if isConnectedToTarget}
    # print(f"current_artist.connections = {current_artist.connections}")
    for connection in current_artist.connections:
        # print(f"Checking if {connection.name} -> {target_artist.name}")

        if connection.id == target_artist.id:
            print(f"returning [{current_artist.name}, {target_artist.name}]")
            return [current_artist, target_artist]

        if connection.id in checked_artist_ids:
            print(f"returning [{current_artist.name}, {connection.name}, {target_artist.name}]")
            return [current_artist, connection, target_artist]

    print(f"appending [{current_artist.name}, False] to checked_artists.")
    checked_artists.append((current_artist, False))
    return []

def remove_connections(artist_list : List[Artist]) -> List[Artist]:
    for artist in artist_list:
        artist.connections = None
    return artist_list

async def send_route_update(ws_connection, graph_manager: GraphManager, display_message: str, new_artist: Artist, current_depth: int,send_full_graph=False, overrideUpdateType: bool = None) -> None:
    # updated_artist_id: str = None # holds id of the artist that was visited (needs isComplete to be adjusted on frontend) 
    update_type = overrideUpdateType if overrideUpdateType else "route"
    # TODO: complete this so that new updates are sent to frontend in correct format.
    print(f"new_artist.name = {new_artist.name}, connection_count = {len(new_artist.connections)} ({current_depth})")
    graph_manager.add_artist(new_artist, current_depth)
    
    changes = graph_manager.get_changes()
    if send_full_graph:
        full_graph = graph_manager.get_graph()
        await ws_connection.send_text(json.dumps({"update_type": update_type,
                                            "message": display_message, 
                                            "graph": full_graph.to_dict(), 
                                            #  "changed_artist" : updated_artist_id, 
                                            "artist_id": new_artist.id,
                                            "full_graph": True}))
    else:
        await ws_connection.send_text(json.dumps({"update_type": update_type,
                                            "message": display_message, 
                                            "graph_additions": changes.to_dict(), 
                                            #  "changed_artist" : updated_artist_id, 
                                            "artist_id": new_artist.id,
                                            "full_graph": False}))
    
async def set_selected_artist(ws_connection, selected_artist: Artist, graph_manager : GraphManager = None):
    send_full_graph = graph_manager != None
    if send_full_graph:
        graph_manager.set_selected_artist(selected_artist)
        graph = graph_manager.get_graph()
        await ws_connection.send_text(json.dumps({"update_type": "selection", 
                                              "message": f"Artist selected for expansion : {selected_artist.name}", 
                                              "graph": graph.to_dict(),
                                              "full_graph": True}))
    else:
        await ws_connection.send_text(json.dumps({"update_type": "selection", 
                                              "message": f"Artist selected for expansion : {selected_artist.name}", 
                                              "selected_artist": selected_artist.id,
                                              "full_graph": False}))

class RouteReply(BaseModel):
    route_list: List[Artist]
    graph: Optional[GraphStructure] = None
    
async def find_route(starting_artist: Artist, ending_artist: Artist, ws_connection: WebSocket, db : Session = None, send_full_graph=True) -> RouteReply:
    # base case. 
    # To disable DB entry can just pass db as None
    if starting_artist.id == ending_artist.id: 
        return RouteReply([starting_artist], graph=None)
        
    found = False
    artist_route = [] # return value 
    starting_artist = starting_artist
    checked_artists: List[Tuple[Artist, bool]] = []
    unchecked_artists: List[Tuple[Artist, int, int, List[Artist]]] = [] # Artist, depth from starting artist, calculated weight, previous connections
    graph_manager: GraphManager = GraphManager()
    
    flipped_artists = False
    flipped_artist_str = ""
    if starting_artist.popularity > ending_artist.popularity:
        starting_artist, ending_artist = ending_artist, starting_artist
        flipped_artists = True
        flipped_artist_str = "Flipped order due to starting artist being more popular, so easier to find"
        # switches round as starting artist is more popular so will be easier to reach from ending artist as a start.
        
    if ws_connection:
        await send_route_update(ws_connection, graph_manager, f"Starting route finding: {starting_artist.name} -> {ending_artist.name} (" + flipped_artist_str + ") ",  starting_artist, 0, overrideUpdateType="start", send_full_graph=send_full_graph)

    # 1. Get all related artists for the first artist. 
    
    starting_artist.connections = get_connections(starting_artist, db)
    print(f"Artists connecting to {starting_artist.name} \n")
    await send_route_update(ws_connection, graph_manager, f"Connections for {starting_artist.name} added. ", starting_artist, 0, send_full_graph=send_full_graph)
    for artist in starting_artist.connections: 
        # print(f"artist.name = {artist.name}, ending_artist.name = {ending_artist.name}")
        if artist.id == ending_artist.id:
            found = True
            
    await set_selected_artist(ws_connection, ending_artist, graph_manager=graph_manager)
    ending_artist.connections = get_connections(ending_artist, db)
    save_artist(db, ending_artist)
    print(f"Artists connecting to {ending_artist.name} \n")
    for artist in ending_artist.connections:
        checked_artists.append((artist, True))
        # print(f"Artist number {count}: {artist.name} \n")
    await send_route_update(ws_connection, graph_manager, f"Connections for {ending_artist.name} added. ", ending_artist, -1, send_full_graph=send_full_graph)
        
    # starting_artist.connections = get_multiple_artists(starting_artist.connections) -> moved this into get_connections, shouldnt be needed anymore
    for artist in starting_artist.connections:
        # Due to immutability of tuples, needs to be ran here, the get_multiple_artists call is made here as its more efficient purely on spotify api calls, not overall runtime. (as if the connection is directly from starting_artist then the extra information is not required)
        # due to get_multiple_artists being relocated inside get_connections, i believe this can be moved to the first starting_artist.connections for loop, but if it aint broke dont fix it sort of logic applies here as of this comment.
        unchecked_artists.append((artist, 1, -1, [starting_artist]))
    if db:
        save_artist(db, starting_artist)
    if found:
        route_list = [ending_artist, starting_artist] if flipped_artists else [starting_artist, ending_artist]
        await send_route_update(ws_connection, graph_manager, f"Route Complete: {starting_artist.name} -> {ending_artist.name}. Found in 1 link.", ending_artist, 1, send_full_graph=send_full_graph)
        graph_manager.finalise_graph(ending_artist, route_list)
        route_reply = RouteReply(
        route_list=route_list,
        graph=graph_manager.get_graph() if send_full_graph else None
        )
        return route_reply
    
    potential_end = check_if_complete(starting_artist, checked_artists, ending_artist)
    if potential_end != []:
        # to check if target_artist or connecting artist is used
        required_connecting_artist = len(potential_end) > 2
        if required_connecting_artist:
            potential_end[1].connections = get_connections(potential_end[1])
            # Fixes inconsistencies in spotifys data where A has a connection to B but B doesnt have one back even though they should.
            if not any(conn.id == ending_artist.id for conn in potential_end[1].connections): 
                    potential_end[1].connections.append(ending_artist)  
            #
            await send_route_update(ws_connection, graph_manager, f"Connections for {potential_end[1].name} added", potential_end[1], 1, send_full_graph=send_full_graph)
        print(f"potential_end is not empty. answer should be found")
        # line below is erroring because the chosen_artist in this case is not 
        for artist in potential_end:
            artist_route.append(artist)
            print(f"added {artist.name} to artist_route. -> [{', '.join([artist.name for artist in artist_route])}]")
        found = True
    while not found: 
        
        #1. sort unchecked_artists.
        unchecked_artists = sort_by_weight(unchecked_artists, ending_artist)
        #2. remove last artist from the list and get their connections. 
        artist_with_connections_found = False
        while not artist_with_connections_found:
            chosen_artist : Tuple[Artist, int, int, List[Artist]] = unchecked_artists.pop(-1)
            print(f"chosen_artist = {chosen_artist[0].name}. Depth: {chosen_artist[1]}. Weight: {chosen_artist[2]}. Previous_connections = [{', '.join([artist.name for artist in chosen_artist[3]])}]")
            if (not send_full_graph):
                await set_selected_artist(ws_connection, chosen_artist[0], graph_manager=graph_manager)
            chosen_artist[0].connections = get_connections(chosen_artist[0], db) # chosen_artist needs to be saved to database seen as it has its connections.
            chosen_artist[0].lastUpdated = datetime.now(pytz.utc)
            if chosen_artist[0].connections is not None:
                artist_with_connections_found = True
            else:
                if len(unchecked_artists) == 0:
                    found=True
                    artist_route = []
        
        await send_route_update(ws_connection, graph_manager, f"Connections for {chosen_artist[0].name} added", chosen_artist[0], chosen_artist[1], send_full_graph=send_full_graph)
        if db:
            save_artist(db, chosen_artist[0])
        potential_end = check_if_complete(chosen_artist[0], checked_artists, ending_artist)
        if potential_end != []:
            # to check if target_artist or connecting artist is used
            required_connecting_artist = len(potential_end) > 2
            if required_connecting_artist:
                potential_end[1].connections = get_connections(potential_end[1])
                # Fixes inconsistencies in spotifys data where A has a connection to B but B doesnt have one back even though they should.
                if not any(connection.id == ending_artist.id for connection in potential_end[1].connections): 
                    potential_end[1].connections.append(ending_artist)  
                #
                await send_route_update(ws_connection, graph_manager, f"Connections for {potential_end[1].name} added", potential_end[1], chosen_artist[1] + 1, send_full_graph=send_full_graph)
            print(f"potential_end is not empty. answer should be found")
            for artist in chosen_artist[3]:
                artist_route.append(artist)
                print(f"added {artist.name} to artist_route. -> [{', '.join([artist.name for artist in artist_route])}]")
            for artist in potential_end:
                artist_route.append(artist)
                print(f"added {artist.name} to artist_route. -> [{', '.join([artist.name for artist in artist_route])}]")
            found = True
        else:
            #3. add their connections to unchecked_artists (with their associated depth being the artist just removed + 1.) 
            # Assuming checked_artists is a list of tuples [Artist, Bool]
            checked_artist_ids = {artist.id for artist, _ in checked_artists}
            unchecked_artists_ids = {artist.id for artist, _, _, _ in unchecked_artists}
            new_previous_connections = []
            for connection in chosen_artist[3]:
                new_previous_connections.append(connection)
            new_previous_connections.append(chosen_artist[0])    
            # print(f"{new_previous_connections}")
            for connection in chosen_artist[0].connections:
                if connection.id not in checked_artist_ids and connection.id not in unchecked_artists_ids:
                    unchecked_artists.append((connection, chosen_artist[1] + 1, -1, new_previous_connections)) #if errors try chosen_artist[3].append(chosen_artist[0])
                    # print(f"Added ({connection.name}, {chosen_artist[1] + 1}, -1, {",".join(artist.name for artist in new_previous_connections)})")
    
    need_info = False
    for artist in artist_route:
        if artist.popularity == -1:
            # means artist has been skipped (had direct connection to target_artist)
            need_info = True       
    if need_info:
        artist_route = get_multiple_artists(artist_route)
        print(f"{artist_route}")

    save_multiple_artists(db, artist_route) 
    route_list = artist_route[::-1] if flipped_artists else artist_route
    graph_manager.finalise_graph(ending_artist, route_list)
    route_reply = RouteReply(
        route_list=route_list,
        graph=graph_manager.get_graph() if send_full_graph else None
    ) 
       
    return route_reply       
