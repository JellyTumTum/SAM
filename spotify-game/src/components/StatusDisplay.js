import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    Typography,
} from '@material-tailwind/react';
import { Progress } from "@material-tailwind/react";


const StatusDisplay = ({ primaryMessage, secondaryMessage, progress_bar_percent, complete_route }) => {
    const cardRef = useRef(null);

    return (
        <Card
            ref={cardRef}
            className={`transition-all duration-300 ease-in-out overflow-visible ${complete_route ? 'h-12' : 'h-20'} w-full bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg pt-2 pl-2 pr-2 border-accent dark:border-darkAccent relative`}
        >

            {/* Messages */}
            <div className="flex flex-col justify-start items-center">
                <Typography variant="h6" className="text-txt text-md dark:text-darkTxt">
                    {primaryMessage}
                </Typography>
                <Typography variant="body2" className="text-sm text-txt dark:text-darkTxt">
                    {secondaryMessage}
                </Typography>
            </div>

            {/* Progress Bar */}
            {progress_bar_percent !== null && (
                // Progress bar from https://www.material-tailwind.com/docs/html/progress-bar
                <div className="flex-start flex h-2.5 w-full overflow-hidden rounded-full bg-blue-gray-50 font-sans text-xs font-medium bg-background dark:bg-darkBackground mt-2">
                    <div className="flex h-full w-1/2 items-center justify-center overflow-hidden break-all rounded-full bg-accent dark:bg-darkAccent text-white"></div>
                </div>
            )}
        </Card>
    );
};

export default StatusDisplay;
