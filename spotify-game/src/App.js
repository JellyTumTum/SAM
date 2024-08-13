import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import RouteFinding from './components/RouteFinding';
import './App.css';

function App() {

    return (
        <div className="App dark:bg-darkBackground bg-background">
            <Header />
            <main className="flex-grow">
                <RouteFinding />
            </main>
            {/* <Footer /> */}
        </div>
    );
}

export default App;
