import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

// Helper function to get theme-aware colors
const getThemeColors = (isDarkTheme) => ({
  background: isDarkTheme ? '#1a202c' : '#f5f7fa',
  strokeColor: isDarkTheme ? '#2d3748' : '#ffffff',
  tooltipBg: isDarkTheme ? 'rgba(45, 55, 72, 0.9)' : 'rgba(255, 255, 255, 0.95)',
  tooltipTextColor: isDarkTheme ? '#f7fafc' : '#2d3748',
  legendTextColor: isDarkTheme ? '#e2e8f0' : '#2d3748',
  noDataColor: isDarkTheme ? '#364152' : '#e2e8f0'
});

// Define a blue color scale for walkability scores
// Using a single scheme for consistency, can be adjusted for dark/light if more contrast is needed.
const blueColorScale = [
  '#eff3ff', // Lightest blue
  '#bdd7e7',
  '#6baed6',
  '#3182bd',
  '#08519c'  // Darkest blue
];
// If you want more steps, d3.schemeBlues[9] offers more granularity:
// const blueColorScale = d3.schemeBlues[9]; // or [5], [7] etc.

function ChoroplethMap({ sldData, isDarkTheme }) { // Removed geoData, selectedMetro
  const svgRef = useRef();
  const containerRef = useRef(); // For tooltip and responsive sizing
  const [dimensions, setDimensions] = useState({ width: 975, height: 610 }); // Default D3 map dimensions
  const [usAtlasData, setUsAtlasData] = useState(null);

  // 1. Fetch US atlas data (TopoJSON for states)
  useEffect(() => {
    d3.json(process.env.PUBLIC_URL + '/us-states-10m.json') // Ensure this file exists in public/
      .then(data => {
        console.log("US Atlas Data Loaded:", data); // Log loaded TopoJSON
        setUsAtlasData(data);
      })
      .catch(error => console.error("Error loading US atlas data (us-states-10m.json):", error));
  }, []);

  // 2. Handle responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        // Maintain aspect ratio of a common US map (e.g., Albers USA)
        setDimensions({ width: width, height: width * (610 / 975) }); 
      }
    };
    updateDimensions(); // Initial size
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 3. Main D3 rendering effect
  useEffect(() => {
    if (!usAtlasData || !sldData || sldData.length === 0 || dimensions.width === 0 || dimensions.height === 0) {
      // Clear SVG if data is not ready
      if(svgRef.current) d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const themeColors = getThemeColors(isDarkTheme);
    svg.style('background-color', themeColors.background);

    // --- DATA PREPARATION: Aggregate sldData to state-level walkability ---
    console.log("Raw sldData for map:", sldData.slice(0, 5)); // Log first 5 sldData entries
    const stateWalkabilityData = new Map(); // To store { FIPS: { totalScore: X, count: Y, name: Z } }
    
    // TODO: Define how to get State FIPS from an item in sldData
    // Example: if sldData has GEOID10 (first 2 chars are state FIPS)
    // Or if sldData has a direct STATE_FIPS or STATE_NAME field (which needs mapping to FIPS)
    sldData.forEach(d => {
      let stateFips = null;
      // Prioritize STATEFP if it exists and is a valid FIPS code format
      if (d.STATEFP) {
        stateFips = String(d.STATEFP).padStart(2, '0');
      } else if (d.GEOID10 && typeof d.GEOID10 === 'string' && d.GEOID10.length >= 2) {
        // Fallback to GEOID10 if STATEFP is not available
        stateFips = d.GEOID10.substring(0, 2);
      }
      // Add more conditions if necessary based on your sldData structure
      
      if (stateFips && d.NatWalkInd !== undefined && !isNaN(parseFloat(d.NatWalkInd))) {
        const walkScore = parseFloat(d.NatWalkInd);
        if (!stateWalkabilityData.has(stateFips)) {
          stateWalkabilityData.set(stateFips, { totalScore: 0, count: 0, name: '' }); // Name can be added later from TopoJSON
        }
        const current = stateWalkabilityData.get(stateFips);
        current.totalScore += walkScore;
        current.count += 1;
      }
    });

    const avgStateWalkability = new Map();
    stateWalkabilityData.forEach((data, fips) => {
      avgStateWalkability.set(fips, {
        average: data.totalScore / data.count,
        name: data.name // This will be empty unless populated from TopoJSON later
      });
    });
    console.log("Processed Avg State Walkability Data:", avgStateWalkability); // Log processed state data
    // --- END DATA PREPARATION ---

    const walkValues = Array.from(avgStateWalkability.values()).map(d => d.average);
    const minWalk = d3.min(walkValues) || 0;
    const maxWalk = d3.max(walkValues) || 20; // Default max, adjust as needed

    const colorScale = d3.scaleQuantize()
      .domain([minWalk, maxWalk])
      .range(blueColorScale); // Use the unified blue scale for both themes

    // Explicitly define projection and fit it to the container size and states
    const projection = d3.geoAlbersUsa()
      .fitSize([dimensions.width, dimensions.height], topojson.feature(usAtlasData, usAtlasData.objects.states));

    const pathGenerator = d3.geoPath().projection(projection);

    const states = topojson.feature(usAtlasData, usAtlasData.objects.states);
    console.log("TopoJSON States Features for Rendering:", states.features.slice(0,5)); // Log first 5 state features

    // Add state name to avgStateWalkability from TopoJSON properties
    states.features.forEach(feature => {
        if(avgStateWalkability.has(feature.id)) {
            avgStateWalkability.get(feature.id).name = feature.properties.name;
        }
    });

    // Tooltip setup (appended to containerRef for better positioning control)
    const tooltip = d3.select(containerRef.current).append("div")
      .attr("class", "tooltip") // Uses styles from App.css
      .style("opacity", 0)
      .style("position", "absolute")
      .style("pointer-events", "none");

    // Draw states
    svg.append("g")
      .attr("class", "states")
      .selectAll("path")
      .data(states.features)
      .join("path")
        .attr("d", pathGenerator)
        .attr("fill", d => {
          const stateData = avgStateWalkability.get(d.id); // d.id is state FIPS
          return stateData ? colorScale(stateData.average) : themeColors.noDataColor;
        })
        .style("stroke", themeColors.strokeColor)
        .style("stroke-width", 0.5)
        .on("mouseover", function(event, d_topo) {
          d3.select(this).raise().style("stroke-width", 1.5).style("stroke", isDarkTheme ? '#fff' : '#000');
          const stateData = avgStateWalkability.get(d_topo.id);
          const [mx, my] = d3.pointer(event, containerRef.current);
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`<strong>${stateData ? stateData.name : d_topo.properties.name}</strong><br/>Avg. Walkability: ${stateData ? stateData.average.toFixed(2) : 'N/A'}`)
            .style("left", (mx + 15) + "px")
            .style("top", (my - 15) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).style("stroke-width", 0.5).style("stroke", themeColors.strokeColor);
          tooltip.transition().duration(500).style("opacity", 0);
        });

    // Draw state borders mesh
    svg.append("path")
      .datum(topojson.mesh(usAtlasData, usAtlasData.objects.states, (a, b) => a !== b))
      .attr("fill", "none")
      .attr("stroke", themeColors.strokeColor)
      .attr("stroke-linejoin", "round")
      .attr("d", pathGenerator);
      
    // --- Legend --- (Ensure legend is not overlapping or causing issues)
    const legendWidth = Math.min(dimensions.width * 0.3, 200); // Made legend slightly smaller
    const legendCellHeight = 15;
    const legendPadding = 20;
    // Position legend to top-right, ensure it doesn't push map off screen
    const legendX = dimensions.width - legendWidth - legendPadding;
    const legendY = legendPadding;

    const legendGroup = svg.append("g")
      .attr("class", "map-legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    const legendTitle = "Avg. Walkability Score";
    legendGroup.append("text")
      .attr("class", "legend-title")
      .attr("x", 0)
      .attr("y", -5) 
      .style("fill", themeColors.legendTextColor)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(legendTitle);

    const legendColorScale = colorScale.copy(); // Use the same scale as the map
    const legendValues = legendColorScale.ticks(5); // Get ~5 representative values from the scale
    const legendDomain = legendColorScale.domain();

    // Create a new scale for positioning items in the legend axis
    const legendAxisScale = d3.scaleLinear()
      .domain(legendDomain)
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendAxisScale)
      .ticks(5, ".1f") // Request 5 ticks, format to 1 decimal place
      .tickSize(legendCellHeight + 5);

    legendGroup.append("g")
      .attr("class", "legend-axis")
      .attr("transform", `translate(0, ${legendCellHeight})`)
      .call(legendAxis)
      .selectAll("text").style("fill", themeColors.legendTextColor);
    
    legendGroup.selectAll(".legend-axis path, .legend-axis line")
        .style("stroke", themeColors.legendTextColor);

    const legendColorsRange = legendColorScale.range();
    const itemWidth = legendWidth / legendColorsRange.length;
    legendGroup.selectAll(".legend-item")
      .data(legendColorsRange)
      .enter().append("rect")
        .attr("class", "legend-item")
        .attr("x", (d, i) => i * itemWidth)
        .attr("y", 0)
        .attr("width", itemWidth)
        .attr("height", legendCellHeight)
        .style("fill", d => d);
    // --- End Legend ---

    // Apply viewBox for responsiveness - this should work with fitSize projection
    svg.attr("viewBox", [0, 0, dimensions.width, dimensions.height].join(' '));

  }, [usAtlasData, sldData, isDarkTheme, dimensions]);

  return (
    // Ensure container allows tooltip to be positioned relative to it
    <div ref={containerRef} style={{ width: '100%', position: 'relative', backgroundColor: getThemeColors(isDarkTheme).background }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: 'auto' }}></svg>
    </div>
  );
}

export default ChoroplethMap;

