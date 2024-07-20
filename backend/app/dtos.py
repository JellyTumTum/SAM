from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class Followers(BaseModel):
    total: int

class Image(BaseModel):
    height: int
    width: int
    url: str

class ArtistItem(BaseModel):
    id: str
    name: str
    followers: Followers
    genres: List[str]
    href: str
    popularity: int
    uri: str
    images: List[Dict]

class ReducedArtists(BaseModel):
    href: str
    items: List[ArtistItem]
    limit: int
    next: Optional[str]
    offset: int
    previous: Optional[str]
    total: int

class ArtistSearchResponse(BaseModel):
    artists: ReducedArtists

class TrackArtist(BaseModel):
    external_urls: Dict[str, str]
    href: str
    id: str
    name: str
    type: str
    uri: str

class Artist(BaseModel):
    id: str
    artURL: str
    followers: int
    name: str
    popularity: int
    lastUpdated: Optional[datetime]
    connections: Optional[List['Artist']]  # Use a forward reference
    genres: Optional[List[str]] = []
    
    def __str__(self):
        connections_str = ', '.join([artist.name for artist in self.connections]) if self.connections else 'None'
        return (
            f"Artist(\n"
            f"  id={self.id},\n"
            f"  artURL={self.artURL},\n"
            f"  followers={self.followers},\n"
            f"  name={self.name},\n"
            f"  popularity={self.popularity},\n"
            f"  lastUpdated={self.lastUpdated},\n"
            f"  connections=[{connections_str}],\n"
            f"  genres={self.genres},\n"
            f")"
        )

    def __repr__(self):
        return self.__str__()

    def __hash__(self):
            return hash(self.id)

    def __eq__(self, other):
        if other.id:
            return self.id == other.id
        else:
            return False
        
    @classmethod
    def from_track_artist(cls, track_artist : TrackArtist):
        return cls(
            id=track_artist.id,
            artURL="",
            followers=-1,
            name=track_artist.name,
            popularity=-1,
            lastUpdated=None,
            connections=None,
            genres=[]
        )
        
    def without_connections(self, **kwargs: any) -> dict:
        instance = self
        instance.connections = None
        return instance


# After the class definition, you need to update forward references
Artist.model_rebuild()

class ExternalURL(BaseModel):
    spotify: str

class AlbumArtist(BaseModel):
    external_urls: Dict[str, str]
    href: str
    id: str
    name: str
    type: str
    uri: str

class Track(BaseModel):
    href: str
    id: str
    name: str
    preview_url: Optional[str]
    track_number: int
    uri: str
    duration_ms: int
    explicit: bool
    external_urls: Dict[str, str]
    is_local: bool
    is_playable: Optional[bool] = None  # Make optional
    popularity: Optional[int] = None  # Make optional
    artists: List[TrackArtist]  # Ensure this is included

class AlbumTracks(BaseModel):
    href: str
    items: List[Track]
    limit: int
    next: Optional[str]
    offset: int
    previous: Optional[str]
    total: int

class Album(BaseModel):
    album_type: str
    total_tracks: int
    available_markets: List[str]
    external_urls: Dict[str, str]
    href: str
    id: str
    images: List[Image]
    name: str
    release_date: str
    release_date_precision: str
    restrictions: Optional[Dict[str, str]] = None
    type: str
    uri: str
    artists: List[AlbumArtist]
    album_group: Optional[str] = None
    tracks: Optional[AlbumTracks] = None

class AlbumsResponse(BaseModel):
    href: str
    limit: int
    next: Optional[str]
    offset: int
    previous: Optional[str]
    total: int
    items: List[Album]

# After the class definition, you need to update forward references
Album.model_rebuild()
Track.model_rebuild()
