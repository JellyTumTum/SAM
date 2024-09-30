import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from "@material-tailwind/react";
import './index.css';
import App from './App';

// Loading dark mode from storage (prevents reseting)
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'true') {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    //   <React.StrictMode>
    <ThemeProvider>
        <App />
    </ThemeProvider>
    //  </React.StrictMode>
);
