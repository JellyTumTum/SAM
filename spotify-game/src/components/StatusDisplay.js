import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    Typography,
} from '@material-tailwind/react';


const StatusDisplay = ({ primaryMessage, secondaryMessage, progressBarPercent, completeRoute, hasErrored = false, expandedArtists=0}) => {
    const cardRef = useRef(null);

    return (
        <Card
            ref={cardRef}
            className={`transition-all duration-300 ease-in-out overflow-visible ${completeRoute ? 'h-12' : 'h-20'} w-full bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg ${completeRoute ? 'pt-3' : 'pt-2'} pl-2 pr-2 ${hasErrored ? 'border-2 border-negative' : 'border-0'} relative`}
        >

            {/* Messages */}
            <div className="flex flex-col justify-start items-center">
                <div className="flex flex-row justify-between items-center w-full px-4">
                    <Typography variant="h6" className="text-txt text-md dark:text-darkTxt">
                        {primaryMessage}
                    </Typography>
                    <Typography variant="h6" className="text-txt text-md dark:text-darkTxt">
                        Artists searched: {expandedArtists}
                    </Typography>
                </div>

                <Typography variant="paragraph" className="text-sm text-txt dark:text-darkTxt">
                    {secondaryMessage}
                </Typography>
            </div>

            {/* Progress Bar */}
            {progressBarPercent !== null && (
                // Progress bar from https://www.material-tailwind.com/docs/html/progress-bar
                <div className="flex-start flex h-2.5 w-full overflow-hidden rounded-full bg-background font-sans text-xs font-medium dark:bg-darkBackground mt-2">
                    <div
                        className="flex h-full items-center justify-center overflow-hidden break-all rounded-full bg-accent dark:bg-darkAccent text-white transition-all duration-300 ease-in-out"
                        style={{ width: `${Math.trunc(progressBarPercent)}%` }}></div>
                </div>
            )}
        </Card>
    );
};

export default StatusDisplay;
