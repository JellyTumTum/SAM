import React from 'react';
import { Typography } from '@material-tailwind/react';

import { MoonIcon, SunIcon } from '@heroicons/react/24/solid';

const Header = () => {
    const toggleDarkMode = () => {
        document.documentElement.classList.toggle('dark');
        const isDarkMode = document.documentElement.classList.contains('dark');
        localStorage.setItem('darkMode', isDarkMode);
    };

    return (
        <header className="relative flex justify-center items-center p-4 bg-background2 dark:bg-darkBackground2 w-full" style={{ height: '64px' }}>
            <Typography variant="h2" className="text-txt dark:text-darkTxt" >PROJECT S.A.M</Typography>



            <div className="absolute right-4 inline-flex w-auto items-center space-x-2 align-middle select-none transition duration-200 ease-in">
                <SunIcon className="w-4 h-4 text-yellow-500 dark:text-darkBackground2"></SunIcon>
                <div className="inline-flex items-center ml-auto">
                    <div className="relative inline-block w-8 h-4 rounded-full cursor-pointer">
                        <input id="darkModeSwitch" type="checkbox"
                            class="absolute w-8 h-4 transition-colors duration-300 rounded-full appearance-none cursor-pointer peer bg-background dark:bg-darkBackground"
                            // defaultValue={doGraphCalculations}
                            defaultChecked={document.documentElement.classList.contains('dark')}
                            onChange={toggleDarkMode} />
                        <label htmlFor="darkModeSwitch"
                            class="before:content[''] absolute top-2/4 -left-1 h-5 w-5 -translate-y-2/4 cursor-pointer rounded-full border border-background dark:border-darkBackground bg-yellow-500 dark:bg-cyan-700 shadow-md transition-all duration-300 before:absolute before:top-2/4 before:left-2/4 before:block before:h-10 before:w-10 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-cyan-700 before:dark:bg-yellow-500  before:opacity-0 before:transition-opacity hover:before:opacity-10 peer-checked:translate-x-full peer-checked:darkBackground peer-checked:before:background">
                            <div class="inline-block p-5 rounded-full top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4"
                                data-ripple-dark="true">

                            </div>

                        </label>

                    </div>
                </div>
                <MoonIcon className="w-4 h-4 dark:text-cyan-700 text-background2"></MoonIcon>
            </div>



        </header>
    );
};

export default Header;
