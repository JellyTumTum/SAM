import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import RouteFinding from './components/RouteFinding';
import './App.css';
import { Typography } from '@material-tailwind/react';

function App() {

    const [showWarning, setShowWarning] = useState(true);

    // Run this once when the component mounts
    useEffect(() => {
        const getWarningStatus = () => {
            let warningStatus = localStorage.getItem('showWarning');
            console.log(warningStatus);
            if (warningStatus === 'false') {
                setShowWarning(false);
            }       
        };

        getWarningStatus();
    }, []);

    const onWarningClick = () => {
        setShowWarning(false);
        localStorage.setItem('showWarning', false)
    }

    



    return (
        <div className="App dark:bg-darkBackground bg-background">
            {showWarning &&
                <div onClick={() => onWarningClick()}className="w-full h-6 bg-negative flex items-center justify-center cursor-pointer">
                    <Typography className="text-txt dark:text-darkTxt">
                        This Project is a W.I.P and may experience unexpected behaviour (click / tap to close)
                    </Typography>
                </div>
            }

            <Header />
            <main className="flex-grow">
                <RouteFinding />
            </main>
            {/* <Footer /> */}
        </div>
    );
}

export default App;
