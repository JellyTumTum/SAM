import React, { useState } from 'react';
import Header from './components/Header';
import ArtistSelectionCard from './components/ArtistSelectionCard';
import { Button } from '@material-tailwind/react';
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
            <main className="flex flex-col justify-center items-center h-screen dark:bg-darkBackground bg-background">
                <div className="flex flex-col md:flex-row space-x-0 md:space-x-4 space-y-4 md:space-y-0 bg-background dark:bg-darkBackground">
                    <ArtistSelectionCard title="Starting Artist" selectedArtist={startingArtist} setSelectedArtist={setStartingArtist} />
                    <ArtistSelectionCard title="End Artist" selectedArtist={endArtist} setSelectedArtist={setEndArtist} />
                </div>
                <div className="flex mt-4 w-full max-w-md md:max-w-2xl">
                    <Button onClick={handleFindRoute} className="w-full bg-primary dark:bg-darkBackground2 text-darkTxt">Find Route</Button>
                </div>
            </main>
        </div>
    );
}

export default App;
