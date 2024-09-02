import React, { useState, useEffect, useRef } from 'react';
import ArtistSelectionCard from './ArtistSelectionCard';
import { Button, Typography } from '@material-tailwind/react';
import axios from 'axios';
import DynamicGraph from './DynamicGraph';
import ShowcaseArtist from './ShowcaseArtist';
import StatusDisplay from './StatusDisplay';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const RouteFinding = () => {
    const [startingArtist, setStartingArtist] = useState(null);
    const [endArtist, setEndArtist] = useState(null);

    // graph logic
    const [selectedArtistID, setSelectedArtistID] = useState(null);
    const [prevGraphData, setPrevGraphData] = useState(null);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [displayMessage, setDisplayMessage] = useState(null);
    const [secondaryMessage, setSecondaryMessage] = useState(null)
    const [progressBarPercent, setProgressBarPercent] = useState(null);
    const routeFound = useRef(true);
    // const [selectionMessage, setSelectionMessage] = useState(null);

    // UI Information
    const [hideSelectors, setHideSelectors] = useState(false);

    // Showcase variables
    const [showcaseArtist, setShowcaseArtist] = useState(null);
    const [edgeArtist1, setEdgeArtist1] = useState(null);
    const [edgeArtist2, setEdgeArtist2] = useState(null);

    const [ws, setWs] = useState(null);
    const [wsId, setWsId] = useState(null);
    const [pingInterval, setPingInterval] = useState(null);

    // UI Details 
    const [findRouteString, setFindRouteString] = useState("Find Route");


    // const sampleData = {
    //     "nodes": [
    //         { "id": "1", "name": "Artist A", "popularity": 80, "artURL": "https://i.scdn.co/image/ab6761610000e5ebe672b5f553298dcdccb0e676", "followers": 1000000, "genres": ["Pop", "Rock"] },
    //         { "id": "2", "name": "Artist B", "popularity": 70, "artURL": "https://i.scdn.co/image/ab6761610000e5eb3bcef85e105dfc42399ef0ba", "followers": 800000, "genres": ["Hip Hop"] },
    //         { "id": "3", "name": "Artist C", "popularity": 90, "artURL": "https://i.scdn.co/image/ab67616100005174ee3f614c84b9a473cbdb8e07", "followers": 1200000, "genres": ["Jazz", "Blues"] },
    //         { "id": "4", "name": "Artist D", "popularity": 60, "artURL": "https://i.scdn.co/image/ab676161000051743c350f20203c8bc10c0b5a9f", "followers": 500000, "genres": ["Country"] }
    //     ],
    //     "links": [
    //         { "source": "1", "target": "2" },
    //         { "source": "2", "target": "3" },
    //         { "source": "3", "target": "4" },
    //         { "source": "4", "target": "1" }
    //     ]
    // }


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
        return nodes.map(node => node.id === id ? { ...node, isComplete: true, isSelected: false } : node);
    };

    const updateNodeIsSelected = (nodes, id) => {
        return nodes.map(node => node.id === id ? { ...node, isSelected: true } : node);
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
        const socket = new WebSocket(`ws://localhost:8000/ws/${id}`);
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
        };

        socket.onclose = (event) => {
            console.log(`WebSocket closed: Code = ${event.code}, Reason = ${event.reason}`);
        };

        socket.onmessage = (event) => {
            if (routeFound.current === false) {
                const data = JSON.parse(event.data);
                console.log(data);

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
                        setPrevGraphData(graphData)
                        setGraphData(data.graph)
                    }
                    else {
                        // 2. Add all new additions to the graph
                        data.graph_additions['nodes'][0].isSelected = true
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
                    console.log("RouteFound = " + routeFound + " message = " + data.message)
                    if (data.full_graph) {
                        setPrevGraphData(graphData)
                        setGraphData(data.graph)
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
                        setPrevGraphData(graphData)
                        setGraphData(data.graph)
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
                    setSecondaryMessage(data.message)
                    setProgressBarPercent(data.progress_bar_percent)
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
                    setHideSelectors(true);
                    console.log("Setting HideSelectors to true");
                    setFindRouteString("Finding Route...")
                    const response = await axios.post('http://localhost:8000/routes/find', {
                        starting_artist: startingArtist,
                        ending_artist: endArtist,
                        websocket_id: wsId
                    });
                    routeFound.current = true
                    setFindRouteString("Find Route");
                    console.log('Route:', response.data.route_list);
                    console.log("Final Graph: ")
                    console.log(response.data.graph)
                    setDisplayMessage('Route: ' + response.data.route_list.map(artist => artist.name).join(' -> '));
                    setPrevGraphData(graphData)
                    setGraphData(response.data.graph)
                } catch (error) {
                    console.error('Error finding route:', error);
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
        <div className="flex flex-col items-center h-full dark:bg-darkBackground bg-background relative">
            {/* Status Indicator */}
            <div className="absolute top-4 right-4">
                {routeFound.current ? (
                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                ) : (
                    <XCircleIcon className="h-8 w-8 text-red-500" />
                )}
            </div>

            <p className="text-txt dark:text-darkTxt m-5">websocket id = {wsId}</p>

            {/* old findRoute button */}
            {/* <div className="flex mt-4 w-full max-w-md md:max-w-2xl">
                <Button onClick={handleFindRoute} className="w-full bg-primary dark:bg-darkBackground2 text-darkTxt">{findRouteString}</Button>
            </div> */}
            {/* <div className="flex mt-4 w-full max-w-md md:max-w-2xl">
                <Button onClick={printGraphData} className="w-full bg-primary dark:bg-darkBackground2 text-darkTxt">Print Graph Data</Button>
            </div> */}

            {/* Main Graph Container */}

            <div className="relative w-11/12 mt-10 mb-10 h-full border-2 border-accent dark:border-darkAccent rounded-md">
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
                    <Button onClick={handleFindRoute} className="w-full h-14 bg-primary dark:bg-darkBackground2 text-darkTxt">
                        {findRouteString}
                    </Button>
                </div>

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
                {hideSelectors && graphData.nodes.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4">
                        {/* Takes full width at the bottom with margins adjusted */}
                        <StatusDisplay
                            primaryMessage={displayMessage}
                            secondaryMessage={secondaryMessage}
                            progress_bar_percent={null}
                            complete_route={routeFound.current}
                        />
                    </div>
                )}

                {/* Dynamic Graph */}
                {graphData.nodes.length > 0 && (
                    <DynamicGraph
                        graphData={graphData}
                        prevGraphData={prevGraphData}
                        completeGraph={routeFound.current}
                        onNodeSelect={handleNodeSelect}
                        onEdgeSelect={handleEdgeSelect}
                    />
                )}
            </div>
        </div>
    );

};

export default RouteFinding;


/*

BUGS:
    - Figure out why genres are not being saved to database. it is effecting algorithm due to not calculating weights properly when loaded from db. 
    - When found in one link there is no complete lines. 
    - Longer Searches seem to fail, both http timeout (30s) is reached and the websocket collapses somehow

TODO: 
    - Move the stuff form the top to make more room for the graph.
    - Ways to centralise nodes based on selected artists? (if selected from the route mapping) 

Add adjusters for the physics factors 
    -> UI Redesign so the viewing window is a lot bigger.
        -> Add a connection symbol that notes if a websocket connection is present. 
        -> Adjust ArtistSelection Cards to be more compact, and placed either side of the screen.
        -> Make and implement the 'ArtistShowcase' which shows the last selectedArtist (should be closable) and implement endpoints to provide more information on the connections.

*/