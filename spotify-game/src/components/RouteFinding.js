import React, { useState, useEffect, useRef } from 'react';
import ArtistSelectionCard from './ArtistSelectionCard';
import { Button, Card, Switch, Typography } from '@material-tailwind/react';
import axios from 'axios';
import DynamicGraph from './DynamicGraph';
import ShowcaseArtist from './ShowcaseArtist';
import StatusDisplay from './StatusDisplay';

import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { EyeIcon, EyeSlashIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const RouteFinding = () => {

    const API_URL = process.env.REACT_APP_API_URL;
    const WS_URL = process.env.REACT_APP_WS_URL;
    const [startingArtist, setStartingArtist] = useState(null);
    const [endArtist, setEndArtist] = useState(null);

    // graph logic
    const [selectedArtistID, setSelectedArtistID] = useState(null);
    const [prevGraphData, setPrevGraphData] = useState(null);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [displayMessage, setDisplayMessage] = useState(null);
    const [secondaryMessage, setSecondaryMessage] = useState(null)
    const [progressBarPercent, setProgressBarPercent] = useState(null);
    const [expandedArtists, setExpandedArtists] = useState(null);
    const routeFound = useRef(true);
    const [routeTimer, setRouteTimer] = useState(null);

    // UI Information
    const [highlightRoute, setHighlightRoute] = useState(false);
    const [hasErrored, setHasErrored] = useState(false)
    const [hideSelectors, setHideSelectors] = useState(false);
    const [hideGraph, setHideGraph] = useState(false);
    const [doGraphCalculations, setDoGraphCalculations] = useState(true);
    const [hasWsConnection, setHasWsConnection] = useState(false);
    const [findRouteString, setFindRouteString] = useState("Find Route");
    const rainbowColors = [
        "#8B00FF", "#4B0082", "#0000FF", "#007FFF", "#00FFFF",
        "#00FFBF", "#00FF7F", "#00FF00", "#7FFF00", "#BFFF00",
        "#FFFF00", "#FFBF00", "#FF7F00", "#FF4500", "#FF0000"
    ];
    const [colorLinks, setColorLinks] = useState({});
    const usedColors = new Set();
    const [showUsefulInformation, setShowUsefulInformation] = useState(false);

    // Timer state
    const [timer, setTimer] = useState(0); // in milliseconds
    const timerRef = useRef(null); // Reference to the timer interval

    // Showcase variables
    const [showcaseArtist, setShowcaseArtist] = useState(null);
    const [edgeArtist1, setEdgeArtist1] = useState(null);
    const [edgeArtist2, setEdgeArtist2] = useState(null);

    const [ws, setWs] = useState(null);
    const [wsId, setWsId] = useState(null);
    const [pingInterval, setPingInterval] = useState(null);

    const switchGraphCalculations = () => {
        if (doGraphCalculations) {
            setHideGraph(true)
            setDoGraphCalculations(false)
        } else {
            setHideGraph(false)
            setDoGraphCalculations(true)
        }
    }

    const switchHighlightRoute = () => {
        if (highlightRoute) {
            setHighlightRoute(false)
        } else {
            setHighlightRoute(true)
        }
    }

    const formatTime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const ms = (milliseconds % 1000) / 10; // To get two decimal points
        return `${seconds}.${ms.toFixed(0).padStart(2, '0')}s`;
    };

    const startTimer = () => {
        const startTime = Date.now();

        timerRef.current = setInterval(() => {
            setTimer(Date.now() - startTime);
        }, 10);
    };

    const stopTimer = () => {
        clearInterval(timerRef.current); // Clear the interval to stop the timer
    };


    function hashStringToColor(str) {
        // Hash the string (artist ID) to generate a consistent integer
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Convert the hash to a hex color using HSL
        const hue = Math.abs(hash) % 360;  // Use the hash to generate a hue (0-360)
        const saturation = 70 + Math.random() * 20; // Randomize saturation slightly
        const lightness = 50 + Math.random() * 20; // Randomize lightness slightly

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    function assignColorsToCompleteNodes(graphData, colorLinks) {
        // console.log("Starting color assignment for complete nodes...");
        // console.log("Initial usedColors set:", usedColors);
        // console.log("Initial colorLinks object:", colorLinks);

        // Iterate over all nodes in the graph
        for (const node of graphData.nodes) {
            // console.log(`Checking node with ID: ${node.id}, is_complete: ${node.is_complete}`);

            // Check if the node is complete and not already colored
            if (node.is_complete && !(node.id in colorLinks)) {
                // console.log(`Node ${node.id} is complete and not yet colored.`);

                // Generate a unique color for the node based on the current number of used colors
                const availableColor = hashStringToColor(node.id);

                // console.log(`Assigning color ${availableColor} to node ${node.id}`);

                // Assign the color to the node
                colorLinks[node.id] = availableColor;

                // Mark the color as used
                usedColors.add(availableColor);
                // console.log(`Color ${availableColor} marked as used.`);
            } else if (node.is_complete && node.id in colorLinks) {
                // console.log(`Node ${node.id} is already colored.`);
            } else {
                // console.log(`Node ${node.id} is not complete, skipping.`);
            }
        }

        // console.log("Final colorLinks object:", colorLinks);
        // console.log("Final usedColors set:", usedColors);
        // console.log("Color assignment completed.");

        return colorLinks;
    }

    const setUsefulInformation = (value) => {
        setShowUsefulInformation(value)
        localStorage.setItem('showInformation', JSON.stringify(value));
    }

    useEffect(() => {
        const showInformationLocalStorage = localStorage.getItem('showInformation');

        if (showInformationLocalStorage === null) {
            localStorage.setItem('showInformation', 'true');
            setShowUsefulInformation(false);
        } else {
            setShowUsefulInformation(JSON.parse(showInformationLocalStorage));
        }
    }, []);

    useEffect(() => {
        const id = generateWebSocketId();
        setWsId(id);
        console.log("creating websocket with id: " + id);
        const socket = createWebSocket(id);
        setWs(socket);

        return () => {
            clearInterval(pingInterval);
            if (socket) {
                socket.close();
            }
        };
    }, []);

    const updateNodeIsComplete = (nodes, id) => {
        return nodes.map(node => node.id === id ? { ...node, is_complete: true, is_selected: false } : node);
    };

    const updateNodeIsSelected = (nodes, id) => {
        return nodes.map(node => node.id === id ? { ...node, is_selected: true } : node);
    };

    const mergeGraphData = (existingData, newData) => {
        const existingNodeIds = new Set(existingData.nodes.map(node => node.id));
        const existingLinkIds = new Set(existingData.links.map(link => `${link.source}-${link.target}`));

        const newNodes = newData.nodes.filter(node => !existingNodeIds.has(node.id));
        const newLinks = newData.links.filter(link => !existingLinkIds.has(`${link.source}-${link.target}`));

        return {
            nodes: [...existingData.nodes, ...newNodes],
            links: [...existingData.links, ...newLinks]
        };
    };

    const createWebSocket = (id) => {
        const socket = new WebSocket(`${WS_URL}/ws/${id}`);
        console.log("Attempting to run socket.onopen");

        socket.onopen = () => {
            console.log('WebSocket connection established');
            const interval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'ping' }));
                }
            }, 10000); // Ping every 10 seconds
            setPingInterval(interval);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error observed:', error);
            setHasWsConnection(false);
        };

        socket.onclose = (event) => {
            console.log(`WebSocket closed: Code = ${event.code}, Reason = ${event.reason}`);
            setHasWsConnection(false);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.update_type === "connection_status") {
                console.log(data.message)
                setHasWsConnection(true)
            }


            if (routeFound.current === false) {
                const data = JSON.parse(event.data);
                // console.log(data);

                if (data.update_type === "start") {
                    // Special Case for the first message as it contains just the starting artist and it needs to be set as selected not complete but uses the route configuration. 
                    /*  structure of data: 
                    {"update_type": "start",
                        "message": display_message, 
                        "graph_additions": changes.to_dict(), 
                        "artist_id": new_artist.id}
                    */
                    // 1. Display Message adjustment
                    setDisplayMessage(data.message);
                    if (data.full_graph) {
                        setGraphData(prevGraphData => {
                            setPrevGraphData(prevGraphData)
                            setColorLinks(prevColorLinks => { return assignColorsToCompleteNodes(data.graph, prevColorLinks, rainbowColors) })
                            return data.graph
                        })
                    }
                    else {
                        // 2. Add all new additions to the graph
                        data.graph_additions['nodes'][0].is_selected = true
                        setSelectedArtistID(data.graph_additions['nodes'][0].id)
                        setGraphData(oldGraphData => mergeGraphData(oldGraphData, data.graph_additions));
                    }
                    // 3. Set the starting node as selected.
                }

                if (data.update_type === "route") {
                    /*  structure of data: 
                    {"update_type": "route",
                        "message": display_message, 
                        "graph_additions": changes.to_dict(), 
                        "artist_id": new_artist.id} -> shouldnt be needed due to current setup (using selectedNode)
                    */

                    // 1. Display Message adjustment
                    setDisplayMessage(data.message);
                    setExpandedArtists(prevExpandedArtists => prevExpandedArtists + 1)
                    console.log("RouteFound = " + routeFound + " message = " + data.message)
                    if (data.full_graph) {
                        setGraphData(prevGraphData => {
                            setPrevGraphData(prevGraphData)
                            setColorLinks(prevColorLinks => { return assignColorsToCompleteNodes(data.graph, prevColorLinks, rainbowColors) })
                            return data.graph
                        })
                    }
                    else {
                        // 1. Update selected artist to complete.
                        if (selectedArtistID != null) {
                            const correct_node = selectedArtistID.id === data.artist_id
                            console.log(`selectedNode matches node given: ${correct_node}`);
                        }
                        const newNodes = updateNodeIsComplete(graphData.nodes, data.artist_id)
                        // 2. Add all new additions to the graph
                        setGraphData(prevGraphData => mergeGraphData({ "nodes": newNodes, "links": prevGraphData.links }, data.graph_additions));
                    }
                    // 3. 
                }

                if (data.update_type === "selection") {
                    // Update graphData here
                    /* structure of data:
                    {"update_type": "selection", 
                     "message": f"Artist selected for expansion : {selected_artist.name}", 
                     "artist_id": selected_artist.id}
                    */
                    // 1. Display Message adjustment
                    setDisplayMessage(data.message);
                    if (data.full_graph) {
                        setGraphData(prevGraphData => {
                            setPrevGraphData(prevGraphData)
                            setColorLinks(prevColorLinks => { return assignColorsToCompleteNodes(data.graph, prevColorLinks, rainbowColors) })
                            return data.graph
                        })
                    }
                    else {
                        // 2. Assign selected node
                        const newNodes = updateNodeIsSelected(graphData.nodes, data.artist_id)
                        setSelectedArtistID(data.artist_id)
                        setGraphData(prevGraphData => ({
                            nodes: [...newNodes],
                            links: [...prevGraphData.links]
                        }));
                    }
                }

                if (data.update_type === "status") {
                    /* Structure of Data:
                    {"update_type": "status",
                     "message": display_message,
                     "progress": progress_bar}
                    */
                    console.log(data)
                    setSecondaryMessage(data.message)
                    setProgressBarPercent(data.progress)
                }

            }


        };
        socket.onclose = () => {
            console.log('WebSocket connection closed, attempting to reconnect');
            clearInterval(pingInterval);
            const newId = generateWebSocketId();
            setWsId(newId);
            const newSocket = createWebSocket(newId);
            setWs(newSocket);
        };
        return socket;
    };

    const generateWebSocketId = (length = 8) => {
        const base62Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let wsId = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * base62Characters.length);
            wsId += base62Characters[randomIndex];
        }
        return wsId;
    };

    const ensureWebSocketConnection = (callback, maxRetries = 5, retryCount = 0) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            setFindRouteString("Find Route");
            callback();
        } else if (retryCount < maxRetries) {
            console.log(`WebSocket not open, retrying... (${retryCount + 1}/${maxRetries})`);
            setFindRouteString("Connecting to server...")
            setTimeout(() => ensureWebSocketConnection(callback, maxRetries, retryCount + 1), 1000); // Retry after 1 second
        } else {
            setFindRouteString("Server unavailable");
        }
    };

    const printGraphData = async () => {
        console.log("PRINTING GRAPH DATA: ")
        console.log(graphData)
    }

    const handleFindRoute = async () => {
        ensureWebSocketConnection(async () => {
            if (startingArtist && endArtist) {
                try {
                    routeFound.current = false;
                    setColorLinks({});
                    usedColors.clear();
                    setTimer(0);
                    setHasErrored(false)
                    setHideSelectors(true);
                    setProgressBarPercent(null);
                    setExpandedArtists(0);
                    setFindRouteString("Finding Route...");
                    startTimer();
                    const response = await axios.post(`${API_URL}/routes/find`, {
                        starting_artist: startingArtist,
                        ending_artist: endArtist,
                        websocket_id: wsId
                    });
                    stopTimer();
                    routeFound.current = true;
                    setFindRouteString("Find Route");
                    console.log('Route:', response.data.route_list);
                    console.log("Final Graph: ");
                    console.log(response.data.graph)
                    setDisplayMessage('Route: ' + response.data.route_list.map(artist => artist.name).join(' -> '));
                    setSecondaryMessage("");
                    setProgressBarPercent(null);
                    setGraphData(prevGraphData => {
                        setPrevGraphData(prevGraphData)
                        setColorLinks(prevColorLinks => { return assignColorsToCompleteNodes(response.data.graph, prevColorLinks, rainbowColors) })
                        return response.data.graph
                    })
                } catch (error) {
                    console.error('Error finding route:', error);
                    stopTimer()
                    setHasErrored(true)
                    setFindRouteString("Find Route");
                    setDisplayMessage("An Error occured while attempting to find a path.")
                    setSecondaryMessage(error.response.data.detail + " To prevent further issues, please refresh the page to re-establish a connection");

                }
            } else {
                console.log('one or two artists missing');
            }
        });
    };

    // Add update functions for selected artist and edge
    const handleNodeSelect = (artist) => {
        setShowcaseArtist(artist);
        if (artist != null) {
            handleEdgeSelect(null, null); // Clear edge selection when a node is selected
        }

    };

    const handleEdgeSelect = (edgeNode1, edgeNode2) => {
        setEdgeArtist1(edgeNode1);
        setEdgeArtist2(edgeNode2);
        if (edgeNode1 != null && edgeNode2 != null) {
            handleNodeSelect(null); // Clear edge selection when a node is selected
        }

    };

    return (
        <div className="flex flex-col items-center h-full dark:bg-darkBackground bg-background relative ">
            {/* Top Bar */}
            <div className="w-full flex justify-between items-center p-2 bg-background2 dark:bg-darkBackground2 border-b-2 border-accent dark:border-darkAccent">
                {/* Combined Route Status and Timer Display */}
                <div className="flex items-center space-x-4">
                    {/* Route Status */}
                    <div className="flex items-center space-x-2">
                        <Typography className="text-txt dark:text-darkTxt">Finding Path:</Typography>
                        {!routeFound.current ? (
                            <CheckCircleIcon className="h-6 w-6 text-positive" />
                        ) : (
                            <XCircleIcon className="h-6 w-6 text-negative" />
                        )}
                    </div>

                    {/* Timer Display */}
                    <div className="flex items-center space-x-2">
                        <Typography className="text-txt dark:text-darkTxt">Time Elapsed:</Typography>
                        <Typography className="text-txt dark:text-darkTxt">{formatTime(timer)}</Typography>
                    </div>
                    <InformationCircleIcon onClick={event => { setUsefulInformation(true) }} className='
                h-6 w-6
                text-accent dark:text-darkAccent'>

                    </InformationCircleIcon>
                </div>


                {/* WebSocket Status */}
                <div className="flex items-center space-x-2">
                    <Typography className="text-txt dark:text-darkTxt">Connection Status:</Typography>
                    {hasWsConnection ? (
                        <CheckCircleIcon className="h-6 w-6 text-positive" />
                    ) : (
                        <XCircleIcon className="h-6 w-6 text-negative" />
                    )}
                </div>
                {/* Hide Graph Section */}
                <div className="flex items-center space-x-4">
                    {/* Switch to toggle no graph logic at all */}
                    {/* https://www.material-tailwind.com/docs/html/switch */}
                    <div class="inline-flex items-center">
                        <div class="inline-flex items-center">
                            <div class="relative inline-block w-8 h-4 rounded-full cursor-pointer">
                                <input id="generationSwitch" type="checkbox"
                                    class="absolute w-8 h-4 transition-colors duration-300 rounded-full appearance-none cursor-pointer peer bg-background dark:bg-darkBackground"
                                    defaultValue={doGraphCalculations}
                                    defaultChecked={doGraphCalculations}
                                    onChange={switchGraphCalculations} />
                                <label htmlFor="generationSwitch"
                                    class="before:content[''] absolute top-2/4 -left-1 h-5 w-5 -translate-y-2/4 cursor-pointer rounded-full border border-background dark:border-darkBackground bg-negative shadow-md transition-all duration-300 before:absolute before:top-2/4 before:left-2/4 before:block before:h-10 before:w-10 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-negative before:opacity-0 before:transition-opacity hover:before:opacity-10 peer-checked:translate-x-full peer-checked:bg-positive peer-checked:before:bg-positive">
                                    {/* peer-checked : when its enabled -> peer is due to it linking to the actual checkbox input above */}
                                    <div class="inline-block p-5 rounded-full top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4"
                                        data-ripple-dark="true"></div>
                                </label>
                            </div>
                        </div>
                        <Typography className="text-txt dark:text-darkTxt ml-4">Graph Generation</Typography>
                    </div>

                    {/* Hide Graph Button */}
                    <div className="flex items-center cursor-pointer" onClick={() => setHideGraph(prev => !prev)}>

                        {hideGraph ? (
                            <>
                                {/* Hiding Graph has extra ml-4 to pad and avoid moving stuff.  */}
                                <Typography className="text-txt dark:text-darkTxt mr-2 ml-4"> Hiding Graph</Typography>
                                <EyeSlashIcon className="h-6 w-6 text-txt dark:text-darkTxt transition-transform duration-300 transform hover:rotate-180" />
                            </>
                        ) : (
                            <>
                                <Typography className="text-txt dark:text-darkTxt mr-2">Showing Graph</Typography>
                                <EyeIcon className="h-6 w-6 text-txt dark:text-darkTxt transition-transform duration-300 transform hover:rotate-180" />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Useful Information box */}
            {showUsefulInformation &&
                <Card
                    className={`
                h-3/5 w-11/12 
                m-4 mb-2
                flex flex-col
                bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg justify-between items-center border-2 border-accent dark:border-darkAccent relative`}
                >
                    <XMarkIcon onClick={event => { setUsefulInformation(false) }} className='absolute top-4 right-4
                h-6 w-6
                text-negative'>

                    </XMarkIcon>
                    <Typography className="text-txt dark:text-darkTxt mt-2" variant='h3'>Useful Information </Typography>
                    <div className='flex flex-row h-full w-full justify-between pb-4 px-4'>
                        {/* <Card className={`transition-all duration-300 ease-in-out overflow-visible 
                h-full w-auto 
                p-2
                flex flex-col
                bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg items-center  border-accent dark:border-darkAccent relative`}>
                        <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-md" variant='h4'>Instructions</Typography>
                        <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-sm" variant='paragraph'>
                            1. Enter a starting and ending artist
                        </Typography>
                        <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-sm" variant='paragraph'>
                            2. Adjust settings as needed.
                        </Typography>
                    </Card> */}
                        <Card className={`transition-all duration-300 ease-in-out overflow-visible 
                h-full w-auto
                p-2
                flex flex-col
                bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg items-center  border-accent dark:border-darkAccent relative`}>
                            <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-md" variant='h4'>Settings</Typography>
                            <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-sm" variant='paragraph'>
                                1. Graph Generation: This controls if the graph is generated when receiving graph updates (this includes the physics so if toggled on the graph will render and go through physics operations)
                            </Typography>
                            <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-sm" variant='paragraph'>
                                2. Graph Visibility: Controls only the visibility of the graph. when Hidden, the graph will still run all physics operations on the nodes.
                            </Typography>
                            <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-sm" variant='paragraph'>
                                3. Highlight Path: Can be toggled to lower visibility on the non-crucial nodes. during generation as the route is not known no paths are highlighted so only explored artists will be highlighted.
                            </Typography>
                        </Card>
                        <Card className={`transition-all duration-300 ease-in-out overflow-visible 
                h-full w-auto
                p-2
                flex flex-col
                bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg items-center border-accent dark:border-darkAccent relative`}>
                            <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-md" variant='h4'>Tips for usability</Typography>
                            <Typography className="text-negative dark:text-negative mt-2 text-left text-sm" variant='paragraph'>
                                It has been detected you may be on a mobile device, this application was not designed for mobile use due to some incompatibilties with the graphing framework used. This means the application may be more difficult / unable to be used correctly
                            </Typography>
                            <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-sm" variant='paragraph'>
                                Due to the potential time and space complexity of some of the calculations, the settings described here can be adjusted to make for a better experience. Note that even with these adjusted, some routes are either impossible for the algorithm to find, or take so long that the program essentially cant find it. This is partly due to an unoptimized algorithm on my half, and partly due to the time cost of fetching large ammounts of information from the spotify API. The information being gathered is shown with progress bars at the bottom of the display area during runtime.
                            </Typography>
                            <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-sm" variant='paragraph'>
                                1. Visual clutter Reduction: for extensive searches, especially if they are searching the less popular artists, hiding the graph may be recommended to prevent spasms from the updating graphs initial physics operations. This effect is amplified more when artists only have a few albums to scrape through resulting in quick successive regenerations of the graph.
                            </Typography>
                            <Typography className="text-txt dark:text-darkTxt mt-2 text-left text-sm" variant='paragraph'>
                                2. Preventing Lag: Due to the high number of physics operations (that increase exponentially with graph size), halting the graphs generation does lead to some performance benefit (however quickly dimishes as graphs grow in size), so it can make larger graphs more user-friendly.
                            </Typography>
                            <Typography className="text-negative text-left text-sm mt-2" variant='paragraph'>
                                Even with setting optimisations, some artists either have so many albums to scrape that it will take over a minute just to retrieve the information from spotify, or the path is so hard to find the less than optimal algorithm I use to decide on the next artist cannot find the correct artist (out of potentially 1000s) within a reasonable time-frame before the graph is a physics nightmare to calculate anyway (resulting in a frozen webpage normally, if this happens just close the tab as the routes a lost cause if it hasnt already crashed by this point)
                            </Typography>

                        </Card>
                    </div>
                </Card>
            }

            {/* Main Graph Container */}
            <div className="relative w-11/12 mx-4 mt-4 mb-4 h-full border-2 border-accent dark:border-darkAccent rounded-md overflow-hidden">
                {/* Artist Selection Cards */}
                <div className="absolute top-4 left-4">
                    <ArtistSelectionCard
                        title="Starting Artist"
                        selectedArtist={startingArtist}
                        setSelectedArtist={setStartingArtist}
                        minimize={hideSelectors}
                        setHideSelectors={setHideSelectors}
                    />
                </div>

                <div className="absolute top-4 right-4">
                    <ArtistSelectionCard
                        title="End Artist"
                        selectedArtist={endArtist}
                        setSelectedArtist={setEndArtist}
                        minimize={hideSelectors}
                        setHideSelectors={setHideSelectors}
                    />
                </div>

                {/* Button Between Selection Cards */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex w-[calc(100%-45rem)] justify-center md:flex-1">
                    <Button onClick={handleFindRoute} disabled={!hasWsConnection} className={` ${!hasWsConnection ? 'border-2 border-negative':''} w-full h-14 bg-primary dark:bg-darkBackground2 text-darkTxt`}>
                        {findRouteString}
                    </Button>
                </div>

                <Card
                    className={`transition-all duration-300 ease-in-out overflow-visible 
                        h-10 w-80
                        absolute left-4 ${hideSelectors ? 'top-20' : 'top-[26rem]'}
                        bg-background2 dark:bg-darkBackground2 rounded-lg shadow-lg p-4 flex flex-col justify-between items-center mb-2 border-accent dark:border-darkAccent`}
                >
                    <div class="inline-flex items-center -mt-2">
                        <div class="inline-flex items-center">
                            <div class="relative inline-block w-8 h-4 rounded-full cursor-pointer">
                                <input id="highlightSwitch" type="checkbox"
                                    class="absolute w-8 h-4 transition-colors duration-300 rounded-full appearance-none cursor-pointer peer bg-background dark:bg-darkBackground"
                                    defaultValue={highlightRoute}
                                    defaultChecked={highlightRoute}
                                    onChange={switchHighlightRoute} />
                                <label htmlFor="highlightSwitch"
                                    class="before:content[''] absolute top-2/4 -left-1 h-5 w-5 -translate-y-2/4 cursor-pointer rounded-full border border-background dark:border-darkBackground bg-negative shadow-md transition-all duration-300 before:absolute before:top-2/4 before:left-2/4 before:block before:h-10 before:w-10 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-negative before:opacity-0 before:transition-opacity hover:before:opacity-10 peer-checked:translate-x-full peer-checked:bg-positive peer-checked:before:bg-positive">
                                    {/* peer-checked : when its enabled -> peer is due to it linking to the actual checkbox input above */}
                                    <div class="inline-block p-5 rounded-full top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4"
                                        data-ripple-dark="true"></div>
                                </label>
                            </div>
                        </div>
                        <Typography className="text-txt dark:text-darkTxt ml-4">Highlight Path</Typography>
                    </div>
                </Card>

                {/* Showcase Artists */}
                {showcaseArtist && (
                    <div className={`absolute ${routeFound.current ? 'bottom-16' : 'bottom-24'} left-4`}>
                        {/* Adjusted to place above the status display */}
                        <ShowcaseArtist artist={showcaseArtist} onClose={() => handleNodeSelect(null)} />
                    </div>
                )}

                {edgeArtist1 && edgeArtist2 && (
                    <>
                        <div className={`absolute ${routeFound.current ? 'bottom-16' : 'bottom-24'} left-4`}>
                            {/* Adjusted to place above the status display */}
                            <ShowcaseArtist artist={edgeArtist1} onClose={() => handleEdgeSelect(null, null)} />
                        </div>
                        <div className={`absolute ${routeFound.current ? 'bottom-16' : 'bottom-24'} right-4`}>
                            {/* Adjusted to place above the status display */}
                            <ShowcaseArtist artist={edgeArtist2} onClose={() => handleEdgeSelect(null, null)} />
                        </div>
                    </>
                )}

                {/* Status Display */}
                {displayMessage && graphData.nodes.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4">
                        {/* Takes full width at the bottom with margins adjusted */}
                        <StatusDisplay
                            primaryMessage={displayMessage}
                            secondaryMessage={secondaryMessage}
                            progressBarPercent={progressBarPercent}
                            completeRoute={routeFound.current}
                            hasErrored={hasErrored}
                            expandedArtists={expandedArtists}
                        />
                    </div>
                )}

                {!hasWsConnection &&
                    <div className="absolute bottom-4 left-4 right-4">
                        {/* Takes full width at the bottom with margins adjusted */}
                        <StatusDisplay
                            primaryMessage={"No consistent Connection is currently established to the server"}
                            secondaryMessage={"Route Finding is not available while there is no connection"}
                            progressBarPercent={null}
                            completeRoute={false}
                            hasErrored={true}
                            expandedArtists={expandedArtists}
                        />
                    </div>}

                {/* Dynamic Graph */}
                {graphData.nodes.length > 0 && doGraphCalculations && (
                    <DynamicGraph
                        graphData={graphData}
                        prevGraphData={prevGraphData}
                        completeGraph={routeFound.current}
                        onNodeSelect={handleNodeSelect}
                        onEdgeSelect={handleEdgeSelect}
                        hideGraph={hideGraph}
                        doGraphCalculations={doGraphCalculations}
                        colorLinks={colorLinks}
                        highlightRoute={highlightRoute}
                    />
                )}
            </div>
        </div >
    );


};

export default RouteFinding;


/*

BUGS:
    - Websocket dropping. 
        - need to detect and either halt operation or get reconnection working. 
    - Figure out why genres are not being saved to database. it is effecting algorithm due to not calculating weights properly when loaded from db. 
    - Longer Searches seem to fail, both http timeout (30s) is reached and the websocket collapses somehow
*/