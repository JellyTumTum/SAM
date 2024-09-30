import React, { useState, useEffect, useRef } from 'react';
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
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const ArtistSelectionCard = ({ title, selectedArtist, setSelectedArtist, minimize = false, setHideSelectors }) => {

    const API_URL = process.env.API_URL; 
    const [searchQuery, setSearchQuery] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(0); // Index for keyboard navigation
    const [minimized, setMinimized] = useState(minimize);
    const cardRef = useRef()

    const placeLeft = title.includes('Starting');

    const handleSearch = (artist) => {
        setSelectedArtist(artist);
        setSearchQuery(''); // Clear search field
        setDropdownOpen(false); // Close dropdown on select
    };

    useEffect(() => {
        setMinimized(minimize);
    }, [minimize]);

    const handleInputChange = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 0) {
            try {
                const response = await axios.get(`${API_URL}/artist/search`, {
                    params: { artist_name: query, max_results: 5 },
                });
                setSearchResults(response.data);
                setDropdownOpen(true);
                setHighlightedIndex(0); // Reset highlighted index on new search
            } catch (error) {
                console.error('Error fetching search results:', error);
                setDropdownOpen(false);
            }
        } else {
            setDropdownOpen(false);
        }
    };

    // Toggle minimize/maximize state
    const toggleMinimize = () => setHideSelectors((prev) => !prev);

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (dropdownOpen) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (searchResults.length > 0) {
                    handleSearch(searchResults[highlightedIndex]); // Select highlighted entry
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
            }
        }
    };

    // Close dropdown if clicked outside
    const handleClickOutside = (e) => {
        if (cardRef.current && !cardRef.current.contains(e.target)) {
            setDropdownOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [dropdownOpen, searchResults, highlightedIndex]);



    return (
        <Card
            ref={cardRef}
            className={`transition-all duration-300 ease-in-out overflow-visible ${minimized ? 'h-14' : 'h-96'
                } w-80 bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg p-4 flex flex-col justify-between items-center mb-2 border-accent dark:border-darkAccent relative`}
        >
            {/* Minimize/Expand Icon */}
            <div className={`absolute mt-2 top-2 ${placeLeft ? 'left-3' : 'right-3'} cursor-pointer`} onClick={toggleMinimize}>
                {minimized ? (
                    <EyeSlashIcon className="h-6 w-6 text-txt dark:text-darkTxt transition-transform duration-300 transform hover:rotate-180" />
                ) : (
                    <EyeIcon className="h-6 w-6 text-txt dark:text-darkTxt transition-transform duration-300 transform hover:rotate-180" />
                )}
            </div>

            {minimized ? (
                // Minimized view
                <div className="flex flex-col items-center">
                    <Typography variant="h6" className="text-txt font-bold dark:text-darkTxt mb-2">
                        {title}: {selectedArtist?.name || 'None'}
                    </Typography>
                </div>
            ) : (
                // Expanded view
                <>
                    <Typography variant="h6" className="text-txt font-bold dark:text-darkTxt mb-2">
                        {title}
                    </Typography>
                    <div className="w-24 h-24 flex items-center justify-center bg-background dark:bg-darkBackground rounded-full">
                        {selectedArtist ? (
                            <Avatar
                                variant="circular"
                                src={selectedArtist.artURL}
                                alt="Artist"
                                className="object-cover w-full h-full rounded-full"
                            />
                        ) : (
                            <div className="text-3xl text-txt dark:text-darkTxt">?</div>
                        )}
                    </div>
                    <Typography variant="paragraph" className="text-lg font-semibold text-txt dark:text-darkTxt mb-1">
                        {selectedArtist?.name}
                    </Typography>
                    {selectedArtist && (
                        <Typography variant="paragraph" className="text-sm text-accent dark:text-darkAccent">
                            Followers: {selectedArtist?.followers.toLocaleString()}
                        </Typography>
                    )}
                    {selectedArtist && (
                        <Typography variant="paragraph" className="text-sm text-accent dark:text-darkAccent mb-1">
                            Popularity: {selectedArtist?.popularity}
                        </Typography>
                    )}
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
                            <List
                                className="absolute left-1/2 transform -translate-x-1/2 z-50 w-full bg-background dark:bg-darkBackground shadow-lg rounded-lg"
                            >
                                {searchResults.map((artist, index) => (
                                    <ListItem
                                        key={artist.id}
                                        onClick={() => handleSearch(artist)}
                                        className={`cursor-pointer ${index === highlightedIndex ? 'bg-gray-200 dark:bg-darkBackground2' : ''
                                            }`}
                                    >
                                        <ListItemPrefix>
                                            <Avatar
                                                variant="circular"
                                                alt={artist.name}
                                                src={artist.artURL || 'https://via.placeholder.com/96'}
                                            />
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
                </>
            )}
        </Card>
    );
};

export default ArtistSelectionCard;
