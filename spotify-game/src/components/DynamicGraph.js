import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import themeColours from '../themeColours';

const DynamicGraph = ({ graphData, scaleFactor=1 }) => {
    const svgRef = useRef();
    const isDark = localStorage.getItem('darkMode') === 'true';
    const colors = { // American spellchecker forcing me to use colors to avoid annoying squiggly lines.
        background: isDark ? themeColours.darkBackground : themeColours.background,
        background2: isDark ? themeColours.darkBackground2 : themeColours.background2,
        primary: isDark ? themeColours.darkPrimary : themeColours.primary,
        secondary: isDark ? themeColours.darkSecondary : themeColours.secondary,
        accent: isDark ? themeColours.darkAccent : themeColours.accent,
        txt: isDark ? themeColours.darkTxt : themeColours.txt,
        complete: "#3820F0",
        selected: "#A020F0",
        depths: Array.from({ length: 6 }, (_, i) => {
            const depthScale = d3.scaleLinear()
                .domain([1, 5])
                .range(["#5ce65c", "#e60000"]); // Bright green to red
            return depthScale(i);
        })
    };
    const scaledMin = 30*scaleFactor
    const scaledMax = 60*scaleFactor

    useEffect(() => {
        if (!graphData) return;

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height);

        svg.selectAll('*').remove(); // Clear previous content

        const g = svg.append('g'); // Add a group to apply the transformations

        const zoom = d3.zoom().on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

        svg.call(zoom);

        const simulation = d3.forceSimulation(graphData.nodes)
        .alpha(0.5) 
        .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(100))
        .alphaTarget(0);

        const link = g.append('g')
            .selectAll('line')
            .data(graphData.links)
            .enter().append('line')
            .attr('stroke', link => {
                const source = graphData.nodes.find(node => node.id === link.source.id);
                const target = graphData.nodes.find(node => node.id === link.target.id);
                if (source.depth < 0 && target.depth < 0) {
                    return colors.txt
                }
                const lowestDepth = Math.min(source.depth, target.depth)
                return colors.depths[lowestDepth]
            })
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 2)
            .on('click', (event, link) => {
                const source = graphData.nodes.find(node => node.id === link.source.id);
                const target = graphData.nodes.find(node => node.id === link.target.id);
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
                if (artist.isSelected) {
                    return colors.selected;
                } else if (artist.isComplete) {
                    return colors.complete;
                } else {
                    return colors.background2;
                }
            })
            .attr('stroke-width', artist => {
                if (artist.isSelected) {
                    return 3; // Slightly larger stroke for selected and complete nodes
                }
                if (artist.isComplete) {
                    return 4;
                } else {
                    return 2; // Default stroke width
                }
            });

        node.append('image')
            .attr('xlink:href', artist => artist.artURL)
            .attr('width', artist => Math.max(2*scaledMin, Math.min(2*scaledMax, (artist.popularity * scaleFactor) / 2)))
            .attr('height', artist => Math.max(2*scaledMin, Math.min(2*scaledMax, (artist.popularity * scaleFactor) / 2)))
            .attr('clip-path', artist => `url(#clip-${artist.id})`)
            .attr('x', d => -Math.max(scaledMin, Math.min(scaledMax, (d.popularity * scaleFactor) / 4)))
            .attr('y', d => -Math.max(scaledMin, Math.min(scaledMax, (d.popularity * scaleFactor) / 4)))
            .on('click', (event, artist) => {
                console.log(`node (${artist.name}) clicked : 
                    depth: (${artist.depth})`);
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

        node.call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    }, [graphData]);

    return (
        <svg ref={svgRef} className="w-full h-full bg-background dark:bg-darkBackground border border-accent dark:border-darkAccent rounded-md"></svg>
    );
};

export default DynamicGraph;
