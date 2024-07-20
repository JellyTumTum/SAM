from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Table, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import pytz

DATABASE_URL = "postgresql://postgres:password@localhost/sam"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def utcnow():
    return datetime.now(pytz.utc)

# Association table for Artist and Genre
artist_genre_association = Table(
    'artist_genre',
    Base.metadata,
    Column('artist_id', String, ForeignKey('artists.id')),
    Column('genre_id', Integer, ForeignKey('genres.id'))
)

class Artist(Base):
    __tablename__ = "artists"

    id = Column(String, primary_key=True, unique=True, index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    arturl = Column(String)
    follower_count = Column(Integer)
    popularity = Column(Integer)
    last_updated = Column(DateTime, default=utcnow)
    is_full_artist = Column(Boolean)  # would be True if the connections are defined

    connections = relationship(
        "Connection",
        primaryjoin="Artist.id == Connection.artist_id",
        foreign_keys="[Connection.artist_id]",
        back_populates="artist",
        overlaps="related_artist"
    )
    
    related_connections = relationship(
        "Connection",
        primaryjoin="Artist.id == Connection.related_artist_id",
        foreign_keys="[Connection.related_artist_id]",
        back_populates="related_artist",
        overlaps="connections"
    )
    
    genres = relationship("Genre", secondary=artist_genre_association, back_populates="artists")

class Connection(Base):
    __tablename__ = "connections"

    id = Column(Integer, primary_key=True, index=True)
    artist_id = Column(String, ForeignKey('artists.id'), nullable=False)
    related_artist_id = Column(String, ForeignKey('artists.id'), nullable=False)
    last_updated = Column(DateTime, default=utcnow)

    artist = relationship(
        "Artist",
        primaryjoin="Connection.artist_id == Artist.id",
        back_populates="connections",
        overlaps="related_connections"
    )
    related_artist = relationship(
        "Artist",
        primaryjoin="Connection.related_artist_id == Artist.id",
        back_populates="related_connections",
        overlaps="connections"
    )
    
    __table_args__ = (
        UniqueConstraint('artist_id', 'related_artist_id', name='unique_artist_connection'),
    )


class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    
    artists = relationship("Artist", secondary=artist_genre_association, back_populates="genres")
    
    
# TODO: add linking between artists and genres. 

Base.metadata.create_all(bind=engine)
