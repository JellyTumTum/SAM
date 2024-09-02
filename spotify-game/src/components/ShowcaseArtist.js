import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    Avatar,
    Typography,
} from '@material-tailwind/react';
import { XCircleIcon } from '@heroicons/react/24/outline';

const ShowcaseArtist = ({ artist, onClose }) => {
    const cardRef = useRef(null);

    // Closes card when clicking outside
    const handleClickOutside = (e) => {
        if (cardRef.current && !cardRef.current.contains(e.target)) {
            onClose();
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!artist) return null;

    return (
        <Card
            ref={cardRef}
            className="transition-all duration-300 ease-in-out overflow-visible h-36 w-96 bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg p-4 flex flex-row justify-start items-center mb-2 border-accent dark:border-darkAccent relative"
        >
            {/* Close Icon */}
            <div className="absolute top-2 right-2 cursor-pointer" onClick={onClose}>
                <XCircleIcon className="h-6 w-6 text-txt dark:text-darkTxt transition-transform duration-300 transform hover:rotate-180" />
            </div>

            {/* Artist Information */}
            <Avatar
                variant="circular"
                src={artist.artURL}
                alt="Artist"
                className="object-cover w-24 h-24 rounded-full mr-4"
            />

            <div className="flex flex-col justify-center">
                <Typography variant="h6" className="text-txt font-bold dark:text-darkTxt">
                    {artist.name}
                </Typography>
                <div className="flex flex-row">
                    <div className="mr-5">
                        <Typography variant="body2" className="text-sm text-accent dark:text-darkAccent">
                            Followers: {artist.followers.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" className="text-sm text-accent dark:text-darkAccent">
                            Popularity: {artist.popularity}
                        </Typography>
                    </div>
                    <div>
                        {/* <Typography variant="h6" className="text-txt dark:text-darkTxt">
              Graph Specific:
            </Typography> */}
                        <Typography variant="body2" className="text-sm text-accent dark:text-darkAccent">
                            Collaborations: {artist.connectionCount || 'Unknown'}
                        </Typography>
                        {artist.depth > 0 &&
                            <Typography variant="body2" className="text-sm text-accent dark:text-darkAccent">
                                Depth: {artist.depth || 'Unknown'}
                            </Typography>
                        }
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default ShowcaseArtist;
