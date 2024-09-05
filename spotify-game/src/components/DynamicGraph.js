import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import themeColours from '../themeColours';
import { ChevronDoubleRightIcon } from '@heroicons/react/24/outline';

/*
ADDITIONS / ADJUSTMENTS:

    - Figure out way to form clusters around people with large connection values, essentially like they are planets with lesser artists orbiting. 
        - probably try make a repulsion force towards other artists, that is lessened if they have a connection with the central artist.

*/

const DynamicGraph = ({ graphData, scaleFactor = 1.1, prevGraphData = null, completeGraph = false, onNodeSelect, onEdgeSelect, hideGraph = false, doGraphCalculations = true, colorLinks}) => {
    const svgRef = useRef();
    const isDark = localStorage.getItem('darkMode') === 'true';
    const [runGraphCalculations, setRunGraphCalculations] = useState(doGraphCalculations)
    const completeIndex = []
    const colors = {
        background: isDark ? themeColours.darkBackground : themeColours.background,
        background2: isDark ? themeColours.darkBackground2 : themeColours.background2,
        primary: isDark ? themeColours.darkPrimary : themeColours.primary,
        secondary: isDark ? themeColours.darkSecondary : themeColours.secondary,
        accent: isDark ? themeColours.darkAccent : themeColours.accent,
        txt: isDark ? themeColours.darkTxt : themeColours.txt,
        complete: "#00ff00",
        selected: isDark ? "ffffff" : "000000",
        depths: Array.from({ length: 6 }, (_, i) => {
            const depthScale = d3.scaleLinear()
                .domain([1, 5])
                .range(["#5ce65c", "#e60000"]); // Bright green to red
            return depthScale(i);
        }),
        // rainbowColors are managed in the RouteFinding and passed in already assigned to a node through colorLinks. this shouldnt be used in here.
        rainbowColors: [
            "#8B00FF", "#4B0082", "#0000FF", "#007FFF", "#00FFFF",
            "#00FFBF", "#00FF7F", "#00FF00", "#7FFF00", "#BFFF00",
            "#FFFF00", "#FFBF00", "#FF7F00", "#FF4500", "#FF0000"
        ]
    };
    const scaledMin = 50 * scaleFactor;
    const scaledMax = 100 * scaleFactor;
    // console.log(colorLinks)

    useEffect((doGraphCalculations) => {
        setRunGraphCalculations(doGraphCalculations)
    })


    useEffect(() => {
        if (!graphData || !doGraphCalculations) return;

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        let svg = d3.select(svgRef.current);
        let zoomTransform = d3.zoomIdentity; // Initialize the zoom transform

        // Preserve the current zoom level if it's already set
        if (svgRef.current.__zoom) {
            zoomTransform = svgRef.current.__zoom;
        }

        svg = svg
            .attr('width', width)
            .attr('height', height);

        svg.selectAll('*').remove();

        const g = svg.append('g'); // Add a group to apply the transformations

        const zoom = d3.zoom().on('zoom', (event) => {
            g.attr('transform', event.transform);
            svgRef.current.__zoom = event.transform; // Store the current zoom transform
        });

        svg.call(zoom).call(zoom.transform, zoomTransform); // Reapply the previous zoom level


        // Sets initial positions and velocities based on previous graph data
        graphData.nodes.forEach(node => {
            if (prevGraphData) {
                const prevNode = prevGraphData.nodes.find(prev => prev.id === node.id);
                if (prevNode) {
                    node.x = prevNode.x;
                    node.y = prevNode.y;
                    node.vx = prevNode.vx;
                    node.vy = prevNode.vy;
                }
            }
        });


        // Normalize function
        const normalize = (value, min, max) => (value - min) / (max - min);

        // // Custom clustering force
        // const clusterForce = (completeGraph) => {
        //     if (completeGraph) {
        //         console.log("Enacting cluster forces")
        //         // Find the min and max connection count
        //         const connectionCounts = graphData.nodes.map(node => node.connections);
        //         const minConnections = Math.min(...connectionCounts);
        //         const maxConnections = Math.max(...connectionCounts);

        //         // Get only complete nodes
        //         const completeNodes = graphData.nodes.filter(node => node.is_complete);

        //         graphData.nodes.forEach(node => {
        //             const normalizedConnections = normalize(node.connections, minConnections, maxConnections);

        //             const neighbors = graphData.links
        //                 .filter(link => link.source.id === node.id || link.target.id === node.id)
        //                 .map(link => link.source.id === node.id ? link.target : link.source);

        //             neighbors.forEach(neighbor => {
        //                 const distance = Math.sqrt((node.x - neighbor.x) ** 2 + (node.y - neighbor.y) ** 2);
        //                 let strength = 2 / (1 + distance); // Base repulsion decreases with distance

        //                 // Increase the repulsion strength for non-connected nodes
        //                 if (!neighbors.includes(neighbor)) {
        //                     strength *= 5 * (1 + normalizedConnections); // Stronger repulsion for more connected nodes
        //                 }

        //                 if (distance > 0) {
        //                     const dx = (node.x - neighbor.x) / distance;
        //                     const dy = (node.y - neighbor.y) / distance;

        //                     node.vx += dx * strength;
        //                     node.vy += dy * strength;
        //                 }
        //             });
        //         });

        //         // Additional repulsion force for complete nodes
        //         for (let i = 0; i < completeNodes.length; i++) {
        //             for (let j = i + 1; j < completeNodes.length; j++) {
        //                 const nodeA = completeNodes[i];
        //                 const nodeB = completeNodes[j];

        //                 const distance = Math.sqrt((nodeA.x - nodeB.x) ** 2 + (nodeA.y - nodeB.y) ** 2);
        //                 if (distance > 0) {
        //                     const dx = (nodeA.x - nodeB.x) / distance;
        //                     const dy = (nodeA.y - nodeB.y) / distance;

        //                     const repulsionStrength = 10 / (1 + distance); // Adjust repulsion strength as needed

        //                     // Apply repulsion force to separate complete nodes
        //                     nodeA.vx += dx * repulsionStrength;
        //                     nodeA.vy += dy * repulsionStrength;
        //                     nodeB.vx -= dx * repulsionStrength;
        //                     nodeB.vy -= dy * repulsionStrength;
        //                 }
        //             }
        //         }
        //     } else {
        //         console.log("Not enacting cluster forces")
        //     }

        // };

        const separateHighConnections = () => {
            graphData.nodes.forEach(nodeA => {
                graphData.nodes.forEach(nodeB => {
                    if (nodeA !== nodeB && nodeA.connections > 1 && nodeB.connections > 1) {
                        const dx = nodeA.x - nodeB.x;
                        const dy = nodeA.y - nodeB.y;
                        const distance = Math.sqrt(dx * dx + dy * dy) * 0.5;
                        if (distance > 0) {
                            // Logarithmic scaling for more natural repulsion
                            const strength = Math.log(1 + 1 / distance) * scaleFactor * 500;
                            nodeA.vx += (dx / distance) * strength;
                            nodeA.vy += (dy / distance) * strength;
                            nodeB.vx -= (dx / distance) * strength;
                            nodeB.vy -= (dy / distance) * strength;
                        }
                    }
                });
            });
        };

        // Define a custom force for increasing attraction between connected nodes
        const attractRelatedNodes = (alpha) => {
            // Iterate over all links to apply the attraction force
            graphData.links.forEach(link => {
                const source = graphData.nodes.find(node => node.id === link.source.id);
                const target = graphData.nodes.find(node => node.id === link.target.id);

                if (source && target) {
                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 0) {
                        // Adjust this strength value for desired attraction force
                        const strength = 0.1 * alpha;  // Adjust the multiplier as needed

                        // Attraction force to pull nodes closer together
                        const attractionForce = strength * distance; // Attraction proportional to distance

                        // Update velocities for both nodes to move them closer
                        source.vx += (dx / distance) * attractionForce;
                        source.vy += (dy / distance) * attractionForce;
                        target.vx -= (dx / distance) * attractionForce;
                        target.vy -= (dy / distance) * attractionForce;
                    }
                }
            });
        };

        const repelCompletedNodes = (alpha) => {
            const completeNodes = graphData.nodes.filter(node => node.is_complete);
        
            // Apply repulsion between all pairs of complete nodes
            for (let i = 0; i < completeNodes.length; i++) {
                for (let j = i + 1; j < completeNodes.length; j++) {
                    const nodeA = completeNodes[i];
                    const nodeB = completeNodes[j];
        
                    const dx = nodeB.x - nodeA.x;
                    const dy = nodeB.y - nodeA.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
        
                    if (distance > 0) {
                        // Adjust this strength value for desired repulsion force
                        const strength = alpha * (-1000 / distance); // Repulsion inversely proportional to distance
        
                        // Repulsion force to push nodes apart
                        const repulsionForce = strength / distance;
        
                        // Update velocities for both nodes to move them apart
                        nodeA.vx -= (dx / distance) * repulsionForce;
                        nodeA.vy -= (dy / distance) * repulsionForce;
                        nodeB.vx += (dx / distance) * repulsionForce;
                        nodeB.vy += (dy / distance) * repulsionForce;
                    }
                }
            }
        };




        const simulation = d3.forceSimulation(graphData.nodes)
            .alpha(0.1)
            .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-500))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(150))
            .force('repulsion', repelCompletedNodes)
            .force('attraction', attractRelatedNodes)
            .on('tick', separateHighConnections)
            .alphaTarget(0);

        const link = g.append('g')
            .selectAll('line')
            .data(graphData.links)
            .enter().append('line')
            .attr('stroke', link => {
                const source = graphData.nodes.find(node => node.id === link.source.id);
                const target = graphData.nodes.find(node => node.id === link.target.id);
                if (link.inRoute) {
                    // console.log(`edge (${source.name} -> ${target.name}) marked as inRoute`)
                    return colors.txt
                }
                if (colorLinks[source.id]) {
                    return colorLinks[source.id]
                } else {
                    return colors.txt
                }
                // const lowestDepth = Math.min(source.depth, target.depth);
                // return colors.depths[lowestDepth];
            })
            .attr('stroke-opacity', 1)
            .attr('stroke-width', link => {
                if (link.inRoute) { return scaledMin / 4 }
                else { return scaledMin / 8 }
            })
            .on('click', (event, link) => {
                const source = graphData.nodes.find(node => node.id === link.source.id);
                const target = graphData.nodes.find(node => node.id === link.target.id);
                onEdgeSelect(source, target);
                console.log(`edge (${source.name} -> ${target.name}) clicked`);
            });

        const clipPath = svg.append('defs')
            .selectAll('clipPath')
            .data(graphData.nodes)
            .enter().append('clipPath')
            .attr('id', d => `clip-${d.id}`)
            .append('circle')
            .attr('r', d => {
                const size = Math.max(scaledMin, Math.min(scaledMax, (d.popularity * scaleFactor) / 4));
                return size;
            });

        const node = g.append('g')
            .selectAll('g')
            .data(graphData.nodes)
            .enter().append('g');

        node.append('circle')
            .attr('r', d => {
                const size = Math.max(scaledMin, Math.min(scaledMax, (d.popularity * scaleFactor) / 4));
                return size;
            })
            .attr('fill', 'none')
            .attr('stroke', artist => {
                if (artist.depth < 0) {
                    return colors.txt;
                } else {
                    return colors.depths[artist.depth]
                }
            })
            .attr('stroke-width', artist => {
                if (artist.is_selected) {
                    return scaledMin / 8; // Slightly larger stroke for selected and complete nodes
                }
                if (artist.is_complete) {
                    return scaledMin / 6;
                } else {
                    return scaledMin / 12; // Default stroke width
                }
            });

        node.append('image')
            .attr('xlink:href', artist => artist.artURL === "default" ? "/defaultSpotifyProfile.png" : artist.artURL)
            .attr('width', artist => Math.max(2 * scaledMin, Math.min(2 * scaledMax, (artist.popularity * scaleFactor) / 2)))
            .attr('height', artist => Math.max(2 * scaledMin, Math.min(2 * scaledMax, (artist.popularity * scaleFactor) / 2)))
            .attr('clip-path', artist => `url(#clip-${artist.id})`)
            .attr('x', d => -Math.max(scaledMin, Math.min(scaledMax, (d.popularity * scaleFactor) / 4)))
            .attr('y', d => -Math.max(scaledMin, Math.min(scaledMax, (d.popularity * scaleFactor) / 4)))
            .on('click', (event, artist) => {
                onNodeSelect(artist);
                console.log(`node (${artist.name}) clicked`);
                console.log(artist)
            });

        node.append('title')
            .text(d => d.name);

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('transform', d => `translate(${d.x}, ${d.y})`);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // node.call(d3.drag()
        //     .on('start', dragstarted)
        //     .on('drag', dragged)
        //     .on('end', dragended));
    }, [graphData]);

    return (
        <svg
            ref={svgRef}
            className={`w-full h-full bg-background dark:bg-darkBackground border border-accent dark:border-darkAccent rounded-md 
                ${hideGraph ? 'opacity-0' : 'opacity-100'}
            `}
        ></svg>
    );
};

export default DynamicGraph;
