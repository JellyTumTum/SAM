import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import themeColours from '../themeColours';

const DynamicGraph = ({ graphData }) => {
    const svgRef = useRef();
    const isDark = localStorage.getItem('darkMode') === 'true';
    const colours = {
        background: isDark ? themeColours.darkBackground : themeColours.background,
        background2: isDark ? themeColours.darkBackground2 : themeColours.background2,
        primary: isDark ? themeColours.darkPrimary : themeColours.primary,
        secondary: isDark ? themeColours.darkSecondary : themeColours.secondary,
        accent: isDark ? themeColours.darkAccent : themeColours.accent,
        txt: isDark ? themeColours.darkTxt : themeColours.txt,
    };

    useEffect(() => {
        if (!graphData) return;

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height);

        svg.selectAll('*').remove(); // Clear previous content

        // Add background rectangle
        // svg.append('rect')
        //     .attr('width', width)
        //     .attr('height', height)
        //     .attr('fill', colours.background);

        const g = svg.append('g'); // Add a group to apply the transformations

        const zoom = d3.zoom().on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

        svg.call(zoom);

        const simulation = d3.forceSimulation(graphData.nodes)
            .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(50));

        const link = g.append('g')
            .attr('stroke', colours.accent)
            .attr('stroke-opacity', 1)
            .selectAll('line')
            .data(graphData.links)
            .enter().append('line')
            .attr('stroke-width', 2)
            .on('click', (event, artist) => {
                const source = graphData.nodes.find(node => node.id === artist.source.id);
                const target = graphData.nodes.find(node => node.id === artist.target.id);
                console.log(`edge (${source.name} -> ${target.name}) clicked`);
            });

        // const node = g.append('g')
        //     .attr('stroke', colours.background2)
        //     .attr('stroke-width', 1.5)
        //     .selectAll('circle')
        //     .data(graphData.nodes)
        //     .enter().append('circle')
        //     .attr('r', artist => artist.popularity / 5)
        //     .attr('fill', artist => d3.interpolateViridis(artist.popularity / 100))
        //     .on('click', (event, artist) => {
        //         console.log(`node (${artist.name}) clicked`);
        //     });

        const clipPath = svg.append('defs')
            .selectAll('clipPath')
            .data(graphData.nodes)
            .enter().append('clipPath')
            .attr('id', d => `clip-${d.id}`)
            .append('circle')
            .attr('r', d => d.popularity / 4);

        const node = g.append('g')
            .attr('stroke', colours.background2)
            .attr('stroke-width', 1.5)
            .selectAll('image')
            .data(graphData.nodes)
            .enter().append('image')
            .attr('xlink:href', artist => artist.artURL)
            .attr('width', artist => artist.popularity / 2) // Adjust the size based on popularity or any other attribute
            .attr('height', artist => artist.popularity / 2) // Adjust the size based on popularity or any other attribute
            .attr('clip-path', artist => `url(#clip-${artist.id})`)
            .on('click', (event, artist) => {
                console.log(`node (${artist.name}) clicked`);
            });

        node.append('title')
            .text(d => d.name);

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            clipPath
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            node
                .attr('x', d => d.x - d.popularity / 4)
                .attr('y', d => d.y - d.popularity / 4);
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
    }, [graphData]);

    return (
        <svg ref={svgRef} className="w-full h-full bg-background dark:bg-darkBackground border border-accent dark:border-darkAccent rounded-md"></svg>
    );
};

export default DynamicGraph;
