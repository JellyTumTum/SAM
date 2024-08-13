import React from 'react';
import { Typography } from '@material-tailwind/react';

const Footer = () => {

    return (
        <footer class="fixed bottom-0 left-0 z-20 w-full p-4 bg-background2 border-t border-accent shadow md:flex md:items-center md:justify-between md:p-6 dark:bg-darkBackground2 dark:border-darkAccent">
            <span class="text-sm text-gray-500 sm:text-center dark:text-gray-400">© Gyatt | <a href="https://cst.dev/" class="hover:underline">Skibidi Ohio</a>. All Rizz Reserved.
            </span>
            <ul class="flex flex-wrap items-center mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 sm:mt-0">
                {/* <li>
                    <a href="#" class="hover:underline me-4 md:me-6">About</a>
                </li>
                <li>
                    <a href="#" class="hover:underline me-4 md:me-6">Privacy Policy</a>
                </li>
                <li>
                    <a href="#" class="hover:underline me-4 md:me-6">Licensing</a>
                </li>
                <li>
                    <a href="#" class="hover:underline">Contact</a>
                </li> */}
            </ul>
        </footer>

    );
};

export default Footer;
