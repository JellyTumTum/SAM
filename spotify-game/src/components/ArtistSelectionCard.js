import React, { useState } from 'react';
import axios from 'axios';
import {
    Card,
    Avatar,
    Typography,
    Input,
    List,
    ListItem,
    ListItemPrefix,
} from '@material-tailwind/react';

const ArtistSelectionCard = ({ title, selectedArtist, setSelectedArtist }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    const handleSearch = (artist) => {
        console.log(artist)
        setSelectedArtist(artist);
        setSearchQuery(''); // Clear search field
        setDropdownOpen(false); // Close dropdown on select
    };

    const handleInputChange = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 0) {
            try {
                const response = await axios.get(`http://localhost:8000/artist/search`, {
                    params: { artist_name: query, max_results: 5 }
                });
                setSearchResults(response.data);
                setDropdownOpen(true);
            } catch (error) {
                console.error('Error fetching search results:', error);
                setDropdownOpen(false);
            }
        } else {
            setDropdownOpen(false);
        }
    };

    return (
        <Card className="w-64 h-96 bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg p-4 flex flex-col justify-between items-center border-2
    border-accent dark:border-darkAccent">
            <Typography variant="h6" className="text-txt font-bold dark:text-darkTxt mb-2">{title}</Typography>
            <div className="w-24 h-24  flex items-center justify-center bg-background dark:bg-darkBackground rounded-full">
                {selectedArtist ? (
                    <Avatar variant="circular" src={selectedArtist.artURL} alt="Artist" className="object-cover w-full h-full rounded-full" />
                ) : (
                    <div className="text-3xl text-txt dark:text-txt">?</div>
                )}
            </div>
            <Typography variant="body1" className="text-lg font-semibold text-txt dark:text-darkTxt mb-1">{selectedArtist?.name}</Typography>
            {selectedArtist &&
                <Typography variant="body1" className="text-sm text-accent dark:text-darkAccent">Followers: {selectedArtist?.followers}</Typography>
            }
            {selectedArtist &&
                <Typography variant="body1" className="text-sm text-accent dark:text-darkAccent mb-1">Popularity: {selectedArtist?.popularity}</Typography>
            }
            <div className="relative w-full">
                <Input
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    className="w-full mb-2 bg-background dark:bg-darkBackground 
                    text-txt dark:text-darkTxt 
                    placeholder:text-txt dark:placeholder:text-darkTxt"
                />
                {dropdownOpen && searchResults.length > 0 && (
                    <List className="absolute z-10 w-full bg-background dark:bg-darkBackground shadow-lg rounded-lg">
                        {searchResults.map((artist) => (
                            <ListItem key={artist.id} onClick={() => handleSearch(artist)}>
                                <ListItemPrefix>
                                    <Avatar variant="circular" alt={artist.name} src={artist.artURL || 'https://via.placeholder.com/96'} />
                                </ListItemPrefix>
                                <div>
                                    <Typography variant="h6" className="text-txt dark:text-darkTxt">
                                        {artist.name}
                                    </Typography>
                                </div>
                            </ListItem>
                        ))}
                    </List>
                )}
            </div>
        </Card>
    );
};

export default ArtistSelectionCard;
