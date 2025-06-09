import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';

function SankeyDiagram({ data, isDarkTheme }) {
  const ref = useRef();
  const PADDING_THRESHOLD = 0; // Lowered to 0 to ensure all links are shown
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (ref.current) {
        const { width } = ref.current.getBoundingClientRect();
        const height = Math.min(Math.max(width * 0.6, 300), 450);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const svgContainer = d3.select(ref.current);
    svgContainer.selectAll('*.tooltip-sankey').remove(); // Clear previous tooltip if any
    svgContainer.selectAll('svg').remove(); // Clear previous svg

    // Define theme-aware colors at the beginning of the effect
    const textColor = isDarkTheme ? '#f7fafc' : '#2d3748';
    const tooltipBackgroundColor = isDarkTheme ? 'rgba(45, 55, 72, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const tooltipBorderColor = isDarkTheme ? '#A0AEC0' : '#CBD5E0';


    const tooltip = d3.select(ref.current).append("div")
      .attr("class", "tooltip tooltip-sankey") // Added specific class for easier selection
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", tooltipBackgroundColor)
      .style("border", `1px solid ${tooltipBorderColor}`)
      .style("color", textColor) // Ensure text color contrasts with background
      .style("padding", "10px")
      .style("border-radius", "8px")
      .style("font-size", "0.9em")
      .style("pointer-events", "none")
      .style("max-width", "300px") // Prevent tooltip from becoming too wide
      .style("word-wrap", "break-word"); // Wrap long text

    console.log("Tooltip element created:", tooltip.node());

    if (!data || data.length === 0 || dimensions.width === 0 || dimensions.height === 0) {
      const placeholderSvg = svgContainer.append('svg')
        .attr('viewBox', '0 0 600 400')
        .style('width', '100%')
        .style('height', dimensions.height > 0 ? `${dimensions.height}px` : '300px');
      placeholderSvg.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('fill', isDarkTheme ? '#f7fafc' : '#2d3748')
        .text('No data for Sankey diagram.');
      return;
    }

    const { width: graphWidth, height: graphHeight } = dimensions;
    const nodeColors = isDarkTheme
      ? ['#2C5282', '#3182CE', '#63B3ED', '#2A4365', '#4299E1', '#90CDF4']
      : ['#74c476', '#41ab5d', '#238b45', '#a1d99b', '#c7e9c0', '#edf8e9'];
    const linkDefaultColor = isDarkTheme ? 'rgba(99, 179, 237, 0.5)' : 'rgba(66, 153, 225, 0.4)';
    const linkHoverColor = isDarkTheme ? 'rgba(144, 205, 244, 0.8)' : 'rgba(44, 123, 205, 0.7)';
    const nodeStrokeHoverColor = isDarkTheme ? '#f7fafc' : '#1A202C';

    const walkabilityLevels = [
      { name: 'Low Walkability', threshold: 7 },
      { name: 'Medium Walkability', threshold: 14 },
      { name: 'High Walkability' }
    ];

    const transportModes = [
      { name: 'Low Auto Dependence (0 Cars)' },
      { name: 'Medium Auto Dependence (1 Car)' },
      { name: 'High Auto Dependence (2+ Cars)' }
    ];

    let nodes = [
      ...walkabilityLevels.map(l => ({ name: l.name, type: 'walkability' })),
      ...transportModes.map(m => ({ name: m.name, type: 'transport' }))
    ];
    let links = [];

    const matrix = Array(walkabilityLevels.length).fill(null).map(() => Array(transportModes.length).fill(0));
    const walkLevelCounts = Array(walkabilityLevels.length).fill(0);
    const transportModeCounts = Array(transportModes.length).fill(0);
    let processedDataPoints = 0;

    data.forEach(d => {
      if (isNaN(d.NatWalkInd) || isNaN(d.Pct_AO0) || isNaN(d.Pct_AO1) || isNaN(d.Pct_AO2p) || isNaN(d.HH) || d.HH <= 0) {
        return;
      }
      processedDataPoints++;

      let walkLevelIdx = -1;
      if (d.NatWalkInd < walkabilityLevels[0].threshold) walkLevelIdx = 0;
      else if (d.NatWalkInd < walkabilityLevels[1].threshold) walkLevelIdx = 1;
      else walkLevelIdx = 2;

      let transportModeIdx = -1;
      const pct0 = d.Pct_AO0;
      const pct1 = d.Pct_AO1;
      const pct2p = d.Pct_AO2p;

      if (pct0 > pct1 && pct0 > pct2p) transportModeIdx = 0;
      else if (pct1 >= pct0 && pct1 > pct2p) transportModeIdx = 1;
      else transportModeIdx = 2;

      if (walkLevelIdx !== -1) walkLevelCounts[walkLevelIdx]++;
      if (transportModeIdx !== -1) transportModeCounts[transportModeIdx]++;

      if (walkLevelIdx !== -1 && transportModeIdx !== -1) {
        matrix[walkLevelIdx][transportModeIdx] += d.HH;
      }
    });

    console.log("Sankey - Processed Data Points:", processedDataPoints);
    console.log("Sankey - Walkability Level Counts (raw data points):", walkLevelCounts);
    console.log("Sankey - Transport Mode Counts (raw data points):", transportModeCounts);
    console.log("Sankey - Data Matrix (Walkability x TransportMode - HH sum):", JSON.parse(JSON.stringify(matrix)));

    for (let i = 0; i < walkabilityLevels.length; i++) {
      for (let j = 0; j < transportModes.length; j++) {
        if (matrix[i][j] > PADDING_THRESHOLD) {
          links.push({
            source: i,
            target: walkabilityLevels.length + j,
            value: matrix[i][j],
            names: [walkabilityLevels[i].name, transportModes[j].name]
          });
        }
      }
    }
    console.log("Sankey - Generated Links (after thresholding):", links);

    if (links.length === 0) {
      const placeholderSvg = svgContainer.append('svg')
        .attr('viewBox', `0 0 ${graphWidth || 600} ${graphHeight || 400}`)
        .style('width', '100%')
        .style('height', `${graphHeight || 300}px`);
      placeholderSvg.append('text')
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('fill', textColor)
        .text('Insufficient data for Sankey flows.');
      return;
    }

    const sankeyGenerator = sankey()
      .nodeWidth(20)
      .nodePadding(15)
      .nodeAlign(sankeyJustify)
      .extent([[10, 10], [graphWidth - 10, graphHeight - 10]]);

    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGenerator({
      nodes: nodes.map(d => ({ ...d })),
      links: links.map(d => ({ ...d }))
    });

    const svg = svgContainer.append('svg')
      .attr('viewBox', [0, 0, graphWidth, graphHeight].join(' '))
      .style('width', '100%')
      .style('height', '100%');

    const linkElements = svg.append('g')
      .attr('fill', 'none')
      .selectAll('g')
      .data(sankeyLinks)
      .join('g')
        .attr('stroke', linkDefaultColor)
        .style('mix-blend-mode', isDarkTheme ? 'lighten' : 'multiply');

    linkElements.append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke-width', d => Math.max(1, d.width))
      .on('mouseover', function(event, d_link) {
        console.log("Link mouseover:", d_link.source.name, "→", d_link.target.name);
        d3.select(this).attr('stroke', linkHoverColor).attr('stroke-width', Math.max(1.5, d_link.width + 0.5));
        tooltip.interrupt().transition().duration(200).style("opacity", 0.9);

        const flowName = (d_link.source && d_link.source.name && d_link.target && d_link.target.name) 
                         ? `${d_link.source.name} → ${d_link.target.name}` 
                         : "Unknown Flow";
        const householdsValue = d_link.value !== undefined ? Math.round(d_link.value).toLocaleString() : "N/A";

        let tooltipHTML = `<strong>Flow:</strong> ${flowName}<br/>` +
                          `<strong>Households:</strong> ${householdsValue}`;

        let percentageDetails = [];

        if (d_link.source && typeof d_link.source.value === 'number' && d_link.source.name && typeof d_link.value === 'number') {
          if (d_link.source.value > 0) {
            const sourcePercent = (d_link.value / d_link.source.value) * 100;
            if (isFinite(sourcePercent)) {
              percentageDetails.push(`- ${sourcePercent >= 0.05 ? sourcePercent.toFixed(1) : '<0.1'}% of total from ${d_link.source.name}`);
            } else {
              percentageDetails.push(`- (N/A % of total from ${d_link.source.name})`);
            }
          } else {
            if (d_link.value === 0) {
               percentageDetails.push(`- 0.0% of total from ${d_link.source.name}`);
            } else {
               percentageDetails.push(`- (N/A % of total from ${d_link.source.name})`);
            }
          }
        }

        if (d_link.target && typeof d_link.target.value === 'number' && d_link.target.name && typeof d_link.value === 'number') {
          if (d_link.target.value > 0) {
            const targetPercent = (d_link.value / d_link.target.value) * 100;
            if (isFinite(targetPercent)) {
              percentageDetails.push(`- ${targetPercent >= 0.05 ? targetPercent.toFixed(1) : '<0.1'}% of total to ${d_link.target.name}`);
            } else {
              percentageDetails.push(`- (N/A % of total to ${d_link.target.name})`);
            }
          } else {
            if (d_link.value === 0) {
                percentageDetails.push(`- 0.0% of total to ${d_link.target.name}`);
            } else {
                percentageDetails.push(`- (N/A % of total to ${d_link.target.name})`);
            }
          }
        }

        if (percentageDetails.length > 0) {
          tooltipHTML += `<br/><br/><strong>Contribution Details:</strong><br/>${percentageDetails.join('<br/>')}`;
        }
        
        tooltip.html(tooltipHTML);
        
        // Positioning logic for tooltip
        const [mouseX, mouseY] = d3.pointer(event, ref.current); // Get pointer relative to the main container
        const containerRect = ref.current.getBoundingClientRect();
        const tooltipRect = tooltip.node().getBoundingClientRect();

        let newX = mouseX + 15;
        let newY = mouseY - 28;

        // Adjust if tooltip goes out of right boundary
        if (newX + tooltipRect.width > containerRect.width) {
          newX = mouseX - tooltipRect.width - 15;
        }
        // Adjust if tooltip goes out of left boundary (less common with +15 offset)
        if (newX < 0) {
          newX = mouseX + 15; // Revert to original right-side offset or set to 0
        }
        // Adjust if tooltip goes out of bottom boundary
        if (newY + tooltipRect.height > containerRect.height) {
          newY = mouseY - tooltipRect.height - 15; // Position above cursor
        }
        // Adjust if tooltip goes out of top boundary
        if (newY < 0) {
          newY = mouseY + 15; // Position below cursor
        }

        tooltip
          .style("left", newX + "px")
          .style("top", newY + "px");
      })
      .on('mouseout', function() {
        console.log("Link mouseout");
        d3.select(this).attr('stroke', linkDefaultColor).attr('stroke-width', d => Math.max(1, d.width));
        tooltip.interrupt().transition().duration(500).style("opacity", 0);
      })
      .on('click', function(event) {
        console.log("Link clicked");
        event.stopPropagation();
        tooltip.interrupt().transition().duration(200).style("opacity", 0);
      });

    const nodeElements = svg.append('g')
      .selectAll('rect')
      .data(sankeyNodes)
      .join('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => Math.max(1, d.y1 - d.y0))
        .attr('width', d => d.x1 - d.x0)
        .attr('fill', (d, i) => nodeColors[i % nodeColors.length])
        .attr('stroke', (isDarkTheme ? '#1A202C' : '#FFFFFF'))
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d_node) {
          console.log("Node mouseover:", d_node.name);
          d3.select(this).attr('stroke', nodeStrokeHoverColor).attr('stroke-width', 1.5);
          linkElements.selectAll('path')
            .filter(d_link => d_link.source === d_node || d_link.target === d_node)
            .transition().duration(150)
            .attr('stroke', linkHoverColor)
            .attr('stroke-opacity', 1);
          tooltip.interrupt().transition().duration(200).style("opacity", 0.9);
          tooltip.html(
            `<strong>Node:</strong> ${d_node.name}<br/>` +
            `<strong>Total Households:</strong> ${Math.round(d_node.value).toLocaleString()}`
          );
          const [x, y] = d3.pointer(event, svgContainer.node());
          tooltip
            .style("left", (x + 15) + "px")
            .style("top", (y - 28) + "px");
        })
        .on('mouseout', function() {
          console.log("Node mouseout");
          d3.select(this).attr('stroke', (isDarkTheme ? '#1A202C' : '#FFFFFF')).attr('stroke-width', 0.5);
          linkElements.selectAll('path')
            .transition().duration(150)
            .attr('stroke', linkDefaultColor)
            .attr('stroke-opacity', null);
          tooltip.interrupt().transition().duration(500).style("opacity", 0);
        });

    svg.append('g')
      .style('font', '11px sans-serif')
      .style('fill', textColor)
      .selectAll('text')
      .data(sankeyNodes)
      .join('text')
        .attr('x', d => d.x0 < graphWidth / 2 ? d.x1 + 8 : d.x0 - 8)
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.x0 < graphWidth / 2 ? 'start' : 'end')
        .text(d => d.name);

    return () => {
      console.log("Cleaning up SankeyDiagram, removing tooltip");
      tooltip.remove();
    };
  }, [data, isDarkTheme, dimensions]);

  return <div ref={ref} style={{ width: '100%', position: 'relative' }} />;
}

export default SankeyDiagram;