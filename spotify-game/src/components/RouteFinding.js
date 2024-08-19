import React, { useState, useEffect, useRef } from 'react';
import ArtistSelectionCard from './ArtistSelectionCard';
import { Button, Typography } from '@material-tailwind/react';
import axios from 'axios';
import DynamicGraph from './DynamicGraph';

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const RouteFinding = () => {
    const [startingArtist, setStartingArtist] = useState(null);
    const [endArtist, setEndArtist] = useState(null);

    // graph logic
    const [selectedArtistID, setSelectedArtistID] = useState(null);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [displayMessage, setDisplayMessage] = useState(null);
    const routeFound = useRef(false);
    // const [selectionMessage, setSelectionMessage] = useState(null);

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
                        setGraphData(data.graph)
                    }
                    else {
                        // 2. Add all new additions to the graph
                        data.graph_additions['nodes'][0].isSelected = true
                        setSelectedArtistID(data.graph_additions['nodes'][0].id)
                        setGraphData(prevGraphData => mergeGraphData(prevGraphData, data.graph_additions));
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

    const handleFindRoute = async () => {
        routeFound.current = false
        ensureWebSocketConnection(async () => {
            if (startingArtist && endArtist) {
                try {
                    setFindRouteString("Finding Route...")
                    const response = await axios.post('http://localhost:8000/routes/find', {
                        starting_artist: startingArtist,
                        ending_artist: endArtist,
                        websocket_id: wsId
                    });
                    setFindRouteString("Find Route");
                    console.log('Route:', response.data.route_list);
                    setDisplayMessage('Route: ' + response.data.route_list.map(artist => artist.name).join(' -> '));
                    setGraphData(response.data.graph)
                    routeFound.current = true
                } catch (error) {
                    console.error('Error finding route:', error);
                }
            } else {
                console.log('one or two artists missing');
            }
        });
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
            <div className="flex flex-col md:flex-row space-x-0 md:space-x-4 space-y-4 md:space-y-0 bg-background dark:bg-darkBackground">
                <ArtistSelectionCard title="Starting Artist" selectedArtist={startingArtist} setSelectedArtist={setStartingArtist} />
                <ArtistSelectionCard title="End Artist" selectedArtist={endArtist} setSelectedArtist={setEndArtist} />
            </div>
            <div className="flex mt-4 w-full max-w-md md:max-w-2xl">
                <Button onClick={handleFindRoute} className="w-full bg-primary dark:bg-darkBackground2 text-darkTxt">{findRouteString}</Button>
            </div>
            <div className="mt-5">
                {displayMessage ? (
                    <p className="text-txt dark:text-darkTxt">{displayMessage}</p>
                ) : (
                    <p className="text-txt dark:text-darkTxt">Status Messages will display here</p>
                )}
            </div>
            <div className="w-11/12 mt-10 mb-10 h-full border-2 border-accent dark:border-darkAccent rounded-md">
                {graphData.nodes.length > 0 && <DynamicGraph graphData={graphData} />}
            </div>
        </div>
    );
};

export default RouteFinding;


/*
TODO: 
- Figure out why genres are not being saved to database. it is effecting algorithm due to not calculating weights properly when loaded from db. 

Try to find a way for the graph spawning to be less explosive. 
Add adjusters for the physics factors 
    -> UI Redesign so the viewing window is a lot bigger.
        -> Add a connection symbol that notes if a websocket connection is present. 
        -> Adjust ArtistSelection Cards to be more compact, and placed either side of the screen.
        -> Make and implement the 'ArtistShowcase' which shows the last selectedArtist (should be closable) and implement endpoints to provide more information on the connections.

*/