from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Set
from datetime import datetime
import copy

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
        print(self.connections)
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
    
class GraphArtist(BaseModel):
    
    id: str
    artURL: str
    followers: int
    name: str
    popularity: int
    last_updated: Optional[datetime]
    genres: Optional[List[str]] = []
    depth: int
    is_complete: bool = False
    is_selected: bool = False
    connectionCount: int = 0
    
    def __init__(self, artist: Artist, depth, is_complete=False, is_selected=False, connectionCount=0):
        super().__init__(
            id=artist.id, 
            artURL=artist.artURL, 
            followers=artist.followers, 
            name=artist.name, 
            popularity=artist.popularity, 
            last_updated=artist.lastUpdated, 
            genres=artist.genres, 
            depth=depth, 
            is_complete=is_complete,
            is_selected=is_selected,
            connectionCount=connectionCount
        )
        
    def set_complete(self):
        self.is_complete = True
        
    def set_selected(self):
        self.is_selected = True
        
    def __hash__(self):
        return hash(self.id)

    def __eq__(self, other):
        if isinstance(other, GraphArtist):
            return self.id == other.id
        return False
    
    def to_dict(self):
        return {
            "id": self.id,
            "artURL": self.artURL,
            "followers": self.followers,
            "name": self.name,
            "popularity": self.popularity,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "last_updated_print": self.last_updated.strftime("%B %d, %Y at %I:%M %p") if self.last_updated else None,
            "genres": self.genres,
            "depth": self.depth,
            "isComplete": self.is_complete,
            "isSelected": self.is_selected
        }
    
class GraphConnection(BaseModel):
    
    source: str # id of a GraphArtist
    target: str # id of a GraphArtist
    inRoute: bool = False
    
    def __init__(self, source: str, target: str):
        super().__init__(
            source=source, 
            target=target)
        
    def __hash__(self):
        return hash(self.source + self.target)

    def __eq__(self, other):
        if isinstance(other, GraphConnection):
            exact_match = self.source == other.source and self.target == other.target
            switched_match = self.source == other.target and self.target == other.source
            return exact_match or switched_match
        return False
        
    def to_dict(self):
        return {
            "source": self.source,
            "target": self.target,
        }
    
class GraphStructure(BaseModel):
    nodes: Set[GraphArtist] = Field(default_factory=set)
    links: Set[GraphConnection] = Field(default_factory=set)
    artist_dict: Dict[str, GraphArtist] = Field(default_factory=dict)
    current_selected_artist_id: str = None

        
    def add_artist(self, artist: Artist, depth: int) -> str:
        return_value = None
        has_connections = artist.connections != None and len(artist.connections) > 1
        if (self.contains_artist(artist)):
            self.artist_dict[artist.id].depth = depth
            self.artist_dict[artist.id].connectionCount = len(artist.connections)
            if has_connections:
                self.set_complete(artist)
                return_value = artist.id
        else:
            graph_artist = GraphArtist(artist, depth, is_complete=has_connections, is_selected=False, connectionCount=len(artist.connections))
            self.nodes.add(graph_artist)
            self.artist_dict[artist.id] = graph_artist
            
        if has_connections:
            for connection in artist.connections:
                # print(f"Connection.name = {connection.name}. Artist.name =  {artist.name}")
                if (not self.contains_artist(connection)):
                    # complicated depth logic just to account for adding artists that arent directly connected to the start
                    new_depth = 0
                    if depth == -1:
                        new_depth = -2
                    else:
                        new_depth = depth+1
                    connectionArtist = GraphArtist(connection, new_depth, is_complete=False, is_selected=False, connectionCount=1)
                    self.nodes.add(connectionArtist)
                    self.artist_dict[connectionArtist.id] = connectionArtist
                else:
                    if self.artist_dict[connection.id].depth < 0:
                        print(f"overriding {connection.name}'s depth with {artist.name}'s depth + 1")
                        self.artist_dict[connection.id].depth = depth+1
                #         for link in self.links:
                #             if link.source == connection.id:
                #                 if self.artist_dict[link.target].depth < depth + 2 or self.artist_dict[link.target].depth < 0:
                #                     print(f"overriding {self.artist_dict[link.target].name}'s depth with {artist.name}'s depth + 2")
                #                     self.artist_dict[link.target].depth = depth+2
                #             if link.target == connection.id:
                #                 if self.artist_dict[link.source].depth < depth + 2 or self.artist_dict[link.source].depth < 0:
                #                     print(f"overriding {self.artist_dict[link.source].name}'s depth with {artist.name}'s depth + 2")
                #                     self.artist_dict[link.source].depth = depth+2
                            
                self.add_connection(artist, connection)
                
        return return_value # Return value denotes if an artists complete status was switched
    
    def add_connection(self, main_artist: Artist, secondary_artist: Artist):
        self.links.add(GraphConnection(main_artist.id, secondary_artist.id)) 
        
    def contains_artist(self, artist: Artist):
        return artist.id in self.artist_dict
    
    def set_complete(self, artist: Artist):
        self.artist_dict[artist.id].set_complete()
        
    def set_selected(self, artist: Artist):
        if self.current_selected_artist_id:
            self.artist_dict[self.current_selected_artist_id].set_complete() # Assumes that as a new one is being selected the last one is being set to complete
        if artist.id in self.artist_dict:
            self.artist_dict[artist.id].set_selected()
        else:
            self.add_artist(artist, -1)
            self.artist_dict[artist.id].set_selected()
        self.current_selected_artist_id = artist.id
        
    def finalise(self, ending_artist, route_list):
        
        required_links = []
        crucial_ids = [artist.id for artist in route_list]
        for link in self.links:
            if link.source == ending_artist.id:
                required_links.append(link)
            # for finding the pathway to highlight it   
            if link.source in crucial_ids and link.target in crucial_ids:
                link.inRoute = True
        for link in required_links:
            if self.artist_dict[link.target].depth < 0:
                print(f"finalisation: adjusting {self.artist_dict[link.target].name}'s depth from {self.artist_dict[link.target].depth} to {self.artist_dict[link.source].depth + 1}")
                self.artist_dict[link.target].depth = self.artist_dict[link.source].depth + 1 
            # if self.artist_dict[link.source].depth < 0:
            #    self.artist_dict[link.source].depth = self.artist_dict[link.target].depth + 1 
        
    
    def to_dict(self):
        return {
            "nodes": [node.to_dict() for node in self.nodes],
            "links": [link.to_dict() for link in self.links],
        }
        

class GraphManager(BaseModel):
    
    full_graph: GraphStructure = Field(default_factory=GraphStructure)
    changes_graph: GraphStructure = Field(default_factory=GraphStructure)
        
    def add_artist(self, artist: Artist, depth: int) -> str: 
        return_value = self.full_graph.add_artist(artist, depth)
        self.changes_graph.add_artist(artist, depth)
        # print(f"len(self.full_graph.nodes) = {len(self.full_graph.nodes)}")
        # print(f"len(self.changes_graph.nodes) = {len(self.changes_graph.nodes)}")
        # print(f"len(self.full_graph.links) = {len(self.full_graph.links)}")
        # print(f"len(self.changes_graph.links) = {len(self.changes_graph.links)}")
        return return_value
    
    def set_selected_artist(self, selected_artist: Artist):
        self.full_graph.set_selected(selected_artist)
        
    def get_changes(self):
        changes = copy.deepcopy(self.changes_graph)
        self.changes_graph = GraphStructure()  # Reset changes graph after sending
        return changes
    
    def get_graph(self):
        return self.full_graph
    
    def finalise_graph(self, ending_artist: Artist, route_list: List[Artist]):
        
        self.full_graph.finalise(ending_artist, route_list)
        
    
    def to_dict(self):
        return {
            "full_graph": self.full_graph.to_dict(),
            "changes_graph": self.changes_graph.to_dict()
        }
        

# After the class definition, you need to update forward references
Album.model_rebuild()
Track.model_rebuild()
