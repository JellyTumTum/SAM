import React, { useState } from 'react';
import Header from './components/Header';
import ArtistSelectionCard from './components/ArtistSelectionCard';
import { Button } from '@material-tailwind/react';
import RouteFinding from './components/RouteFinding';
import axios from 'axios';

function App() {
    const [startingArtist, setStartingArtist] = useState(null);
    const [endArtist, setEndArtist] = useState(null);

    const handleFindRoute = async () => {
        if (startingArtist && endArtist) {
            console.log(startingArtist)
            console.log(endArtist)
            try {
                const response = await axios.post('http://localhost:8000/routes/find', {
                    startingArtist: startingArtist,
                    endingArtist: endArtist
                });
                console.log('Route:', response.data);
            } catch (error) {
                console.error('Error finding route:', error);
            }
        } else {
            console.log('one or two artists missing');
        }
    };

    return (
        <div className="App dark:bg-darkBackground bg-background">
            <Header />
            <main>
                <RouteFinding />
            </main>
        </div>
    );
}

export default App;
