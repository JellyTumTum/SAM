import React from 'react';
import { Typography } from '@material-tailwind/react';

const Header = () => {
  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    const isDarkMode = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDarkMode);
  };

  return (
    <header className="relative flex justify-center items-center p-4 bg-background2 dark:bg-darkBackground2 w-full" style={{ height: '64px' }}>
      <Typography variant="h2">PROJECT S.A.M</Typography>
      <div className="absolute right-4 top-4 inline-block w-12 align-middle select-none transition duration-200 ease-in">
        <input
          type="checkbox"
          name="toggle"
          id="toggle"
          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
          onClick={toggleDarkMode}
          defaultChecked={document.documentElement.classList.contains('dark')}
        />
        <label
          htmlFor="toggle"
          className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
        ></label>
      </div>
    </header>
  );
};

export default Header;
