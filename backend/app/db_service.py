from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
import pytz
from .models import Artist as DbArtist, Genre as DbGenre, Connection as DbConnection, SessionLocal
from .dtos import Artist as DtoArtist
from fastapi import Depends
from typing import List

def save_artist(db: Session, artist: DtoArtist, previous_saves: List[str] = []):
    # ensures all the genres exist before saving them.
    # print(f"Saving {artist.name} to database")
    is_full_artist = len(artist.connections) > 1
    db_genre_list: List[DbGenre] = []
    if artist.popularity != -1 and len(artist.genres) < 0 :
        print(f"Detected that {artist.name} has genres to save")
        db_genre_list = save_artist_genres(db, artist, artist.genres)
    db_artist = db.query(DbArtist).filter(DbArtist.id == artist.id).first()
    if db_artist: # updates existing version
        db_artist.name = artist.name
        db_artist.arturl = artist.artURL
        db_artist.follower_count = artist.followers
        db_artist.popularity = artist.popularity
        db_artist.last_updated = artist.lastUpdated
        db_artist.is_full_artist = is_full_artist
        
    if (not db_artist): # creates new entry
        db_artist = DbArtist(
        id=artist.id,
        name=artist.name,
        arturl=artist.artURL,
        follower_count=artist.followers,
        popularity=artist.popularity,
        last_updated=artist.lastUpdated,
        is_full_artist=is_full_artist,
        genres=db_genre_list
    )
    db.add(db_artist)
    db.commit()
    db.refresh(db_artist)
    previous_saves.append(artist.id)
    for connection in artist.connections:
        if connection.id not in previous_saves:
            save_artist(db, connection, previous_saves) # uh oh recursion its getting serious. 
    if len(artist.connections) > 1:       
        save_artist_connections(db, artist, artist.connections) 
        
    return db_artist

def save_artist_genres(db: Session, dto_artist: DtoArtist, genres: List[str]) -> List[DbGenre]:
    db_genre_list: List[DbGenre] = []
    for genre_name in genres:
        db_genre = db.query(DbGenre).filter(DbGenre.name == genre_name).first()
        if not db_genre:
            db_genre = DbGenre(name=genre_name)
            db.add(db_genre)
            print(f"Added {db_genre.name} to database (id : {db_genre.id})")
            db.commit()
            db.refresh(db_genre)
        
        if db_genre not in db_genre_list:
            db_genre_list.append(db_genre)
    
    db.commit()
    return db_genre_list

def save_artist_connections(db: Session, dto_artist: DtoArtist, connections: List[DtoArtist]):
    
    # print(f"Saving connections for {dto_artist.name}")
    for connection in connections:
        # print(f"Checking Connection: {dto_artist.name} - {connection.name}")
        db_connection = check_connection(db, dto_artist, connection)
        if not db_connection:
            db_connection = DbConnection(artist_id=dto_artist.id, related_artist_id=connection.id)
            # print(f"Adding Connection: {dto_artist.name} - {connection.name}")
            db.add(db_connection)
            db.commit()
            db.refresh(db_connection)
                   
def check_connection(db: Session, artist1: DtoArtist, artist2: DtoArtist) -> DbConnection:
    return db.query(DbConnection).filter(
        or_(
            and_(DbConnection.artist_id == artist1.id, DbConnection.related_artist_id == artist2.id),
            and_(DbConnection.artist_id == artist2.id, DbConnection.related_artist_id == artist1.id)
        )
    ).first()

def save_multiple_artists(db: Session, artists: List[DtoArtist]):
    for artist in artists:
        save_artist(db, artist)
        
def update_artist_with_db(db: Session, artist: DtoArtist) -> DtoArtist:
    print(f"Running update_artist_with_db for {artist.name}")
    dto_artist_from_db: DtoArtist = get_artist_by_id(db, artist.id)
    print(f"Outside of get_artist_by_id for {artist.name}")
    if dto_artist_from_db is not None:
        print(f"Skibidi update_artist_with_db | connections length for {dto_artist_from_db.name} : {len(dto_artist_from_db.connections)}")
        return combine_dto_artists(dto_artist_from_db, artist,
                                   len(dto_artist_from_db.connections) > 1 or len(dto_artist_from_db.connections) > len(artist.connections), db)
    else:
        return artist
    
def combine_artists(non_db_artist: DtoArtist, db_artist: DtoArtist, db: Session=None) -> DtoArtist:
    
    combined_artist = DtoArtist(
        id=non_db_artist.id,
        name=non_db_artist.name, 
        artURL=non_db_artist.artURL,
        followers=non_db_artist.followers,
        popularity=non_db_artist.popularity,
        lastUpdated=non_db_artist.lastUpdated,
        connections=[],
        genres=[]
    )
    
    # Choose values from the artist with the latest lastUpdated time
    if db_artist.lastUpdated and (not non_db_artist.lastUpdated or db_artist.lastUpdated > non_db_artist.lastUpdated):
        combined_artist.artURL = db_artist.artURL
        combined_artist.followers = db_artist.followers
        combined_artist.popularity = db_artist.popularity
        combined_artist.lastUpdated = db_artist.lastUpdated
    else:
        combined_artist.artURL = non_db_artist.artURL
        combined_artist.followers = non_db_artist.followers
        combined_artist.popularity = non_db_artist.popularity
        combined_artist.lastUpdated = non_db_artist.lastUpdated if non_db_artist.lastUpdated else db_artist.lastUpdated

    # Combine connections without duplicates -> done this way cause combining each conflicting similar connection seems like a crazy idea when they shouldnt be different anyway. 
    seen_ids = set()
    combined_connections = []

    for connection in (non_db_artist.connections or []) + (db_artist.connections or []):
        if connection.id not in seen_ids:
            seen_ids.add(connection.id)
            combined_connections.append(connection)

    combined_artist.connections = combined_connections

    # Combine genres without duplicates
    combined_artist.genres = list(set((non_db_artist.genres or []) + (db_artist.genres or [])))
    
    if combined_artist.lastUpdated is None:
        combined_artist.lastUpdated = datetime.now(pytz.utc)
    
    if len(combined_connections) > len(db_artist.connections) and db:
        save_artist(db, combined_artist)

    return combined_artist    

def combine_dto_artists(dto_artist_1: DtoArtist, dto_artist_2: DtoArtist, connections_saved, db: Session=None, ) -> DtoArtist:
    
    combined_artist = DtoArtist(
        id=dto_artist_1.id,
        name=dto_artist_1.name, 
        artURL=dto_artist_1.artURL,
        followers=dto_artist_1.followers,
        popularity=dto_artist_1.popularity,
        lastUpdated=dto_artist_1.lastUpdated,
        connections=[],
        genres=[]
    )
    
    # Choose values from the artist with the latest lastUpdated time
    if dto_artist_2.lastUpdated and (not dto_artist_1.lastUpdated or dto_artist_2.lastUpdated > dto_artist_1.lastUpdated):
        combined_artist.artURL = dto_artist_2.artURL
        combined_artist.followers = dto_artist_2.followers
        combined_artist.popularity = dto_artist_2.popularity
        combined_artist.lastUpdated = dto_artist_2.lastUpdated
    else:
        combined_artist.artURL = dto_artist_1.artURL
        combined_artist.followers = dto_artist_1.followers
        combined_artist.popularity = dto_artist_1.popularity
        combined_artist.lastUpdated = dto_artist_1.lastUpdated if dto_artist_1.lastUpdated else dto_artist_2.lastUpdated

    # Combine connections without duplicates
    seen_ids = set()
    combined_connections = []

    for connection in (dto_artist_1.connections or []) + (dto_artist_2.connections or []):
        if connection.id not in seen_ids:
            seen_ids.add(connection.id)
            combined_connections.append(connection)

    combined_artist.connections = combined_connections

    # Combine genres without duplicates
    combined_artist.genres = list(set((dto_artist_1.genres or []) + (dto_artist_2.genres or [])))
    
    # Catches rare case where no time is set for lastUpdated
    if combined_artist.lastUpdated is None:
        combined_artist.lastUpdated = datetime.now(pytz.utc)
    
    if not connections_saved and db:
        save_artist(db, combined_artist)

    return combined_artist


def get_artist_by_id(db: Session, artist_id: str) -> DtoArtist:
    # Use joinedload to eagerly load genres and connections to keep them attached to the session.
    db_artist = db.query(DbArtist).filter(DbArtist.id == artist_id).options(joinedload(DbArtist.genres), joinedload(DbArtist.connections)).first()
    if db_artist:
        genres = [genre.name for genre in db_artist.genres]
        print(f"database connections for {db_artist.name} : {len(db_artist.connections)} + {len(db_artist.related_connections)}. Length of Genres : {len(genres)}")
        artist = DtoArtist(
            id=db_artist.id,
            artURL=db_artist.arturl,
            followers=db_artist.follower_count,
            name=db_artist.name,
            popularity=db_artist.popularity,
            lastUpdated=db_artist.last_updated,
            genres=genres,
            connections=get_artist_connections(db, db_artist)
        )
        return artist
    return None

def get_artist_connections(db: Session, artist: DbArtist) -> List[DtoArtist]:
    connections: List[DbConnection] = db.query(DbConnection).filter(
        (DbConnection.artist_id == artist.id) | 
        (DbConnection.related_artist_id == artist.id)
    ).options(joinedload(DbConnection.artist), joinedload(DbConnection.related_artist)).all() # added joinedLoad options to fix out of session issues with cached artists. 
 
    # Get all related artists
    related_artists: List[DtoArtist] = convert_raw_connections_to_artists(artist, set(connections + artist.related_connections), requires_connections=True)
    for artist in related_artists:
        if artist.name == 'Taylor Swift':
            print("ON SKIBIDI THIS SHIT WAS HERE WHY")

    return related_artists

def convert_raw_connections_to_artists(db_artist: DbArtist, raw_connections: list[DbConnection], excluded_ids : List[str] = [], requires_connections: bool = True) -> List[DtoArtist]:
    
    related_artists = []
    if not requires_connections:
        return []
    print(f"converting raw connections for {db_artist.name}. raw connection count: {len(raw_connections)}. requires_connections={requires_connections}")
    for connection in raw_connections:
        related_artist = None
        excluded_artist = None
        if connection.related_artist_id in excluded_ids: # connection.artist_id in excluded_ids or --> may need to add back.
            continue
        if connection.artist_id == db_artist.id:
            related_artist : DbArtist = connection.related_artist
            # print(f"Connection Found: {db_artist.name} -> {related_artist.name}")
            excluded_artist = related_artist
        elif connection.related_artist_id == db_artist.id:
            related_artist : DbArtist = connection.artist
            print(f"Connection Found: {related_artist.name} -> {db_artist.name}")
            print(f"adding {related_artist} to excluded_ids")
            excluded_artist = related_artist
        if related_artist != None:
            requires_connections = False
            excluded_ids.append(excluded_artist.id)
            excluded_ids = set(excluded_ids)
            excluded_ids = list(excluded_ids)
            # print(f"convert_raw_connections_to_artists | Appending {excluded_artist.name}'s id to excluded_ids.")
            # print(f"excluded_ids.size = {len(excluded_ids)}")
            dtoArtist : DtoArtist = db_artist_to_dto_artist(related_artist, excluded_ids, requires_connections=requires_connections)
            related_artists.append(dtoArtist)
            # print(f"{db_artist.name}'s related_artists = [{', '.join([artist.name for artist in related_artists])}]")
    return related_artists

def db_artist_to_dto_artist(db_artist: DbArtist, excluded_artists: List[str] = [], requires_connections: bool = True) -> DtoArtist:
    
    # if artist.is_full_artist:
    #     db_genre_list = save_artist_genres(get_db(), artist, artist.genres)
    # removed above logic as i believe the genreList should be attached to the artist already (untested)
    return DtoArtist(
        id=db_artist.id,
        artURL=db_artist.arturl,
        followers=db_artist.follower_count,
        name=db_artist.name,
        popularity=db_artist.popularity,
        lastUpdated=db_artist.last_updated,
        genres=[genre.name for genre in db_artist.genres], # db_artist.genres, -> used to be this but was erroring.
        connections=convert_raw_connections_to_artists(db_artist, db_artist.connections, excluded_artists, requires_connections=requires_connections)
    )

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
