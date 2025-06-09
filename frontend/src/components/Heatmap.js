import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

function Heatmap({ data, isDarkTheme }) {
  const ref = useRef(); // This ref is for the main container div
  const svgRef = useRef(); // New ref for the SVG element itself
  const variables = ['Density', 'JobHousingBalance', 'IntersectionDensity', 'DistanceToTransit', 'Walkability'];

  useEffect(() => {
    const container = d3.select(ref.current);
    container.selectAll('*').remove(); // Clear everything in the container (SVG and tooltip div)

    if (!data || data.length === 0) {
        const placeholderSvg = container
            .append('svg')
            .attr('viewBox', '0 0 500 500')
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('max-height', '500px')
            .append('g')
            .attr('transform', 'translate(100,50)');
        placeholderSvg.append('text')
            .attr('x', 150)
            .attr('y', 200)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('fill', isDarkTheme ? '#f7fafc' : '#2d3748')
            .text('No data for correlation heatmap.');
        return;
    }

    const textColor = isDarkTheme ? '#f7fafc' : '#2d3748';
    const cellStrokeDefault = isDarkTheme ? '#2d3748' : '#e2e8f0';
    const cellStrokeHover = isDarkTheme ? '#90cdf4' : '#2c5282';
    const nanColor = isDarkTheme ? '#364152' : '#CBD5E0'; // Distinct color for NaN

    // Calculate correlations
    const correlations = variables.map(var1 =>
      variables.map(var2 => {
        const values1 = data.map(d => d[var1]).filter(v => typeof v === 'number' && !isNaN(v));
        const values2 = data.map(d => d[var2]).filter(v => typeof v === 'number' && !isNaN(v));
        
        if (values1.length !== values2.length || values1.length === 0) return NaN;

        const mean1 = d3.mean(values1);
        const mean2 = d3.mean(values2);
        if (mean1 === undefined || mean2 === undefined) return NaN;

        const std1 = d3.deviation(values1);
        const std2 = d3.deviation(values2);
        if (std1 === undefined || std2 === undefined || std1 === 0 || std2 === 0) return NaN;

        let covariance = 0;
        for (let i = 0; i < values1.length; i++) {
          covariance += (values1[i] - mean1) * (values2[i] - mean2);
        }
        covariance /= (values1.length -1); // Sample covariance
        
        return covariance / (std1 * std2);
      })
    );

    const margin = { top: 80, right: 20, bottom: 100, left: 120 }; // Adjusted margins for labels
    const svgWidth = 500; // Fixed width for viewBox scaling reference
    const svgHeight = 500;
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const svg = container // Append SVG to the main container referenced by 'ref'
      .append('svg')
      .attr('ref', svgRef) // Assign the svgRef here (though not strictly necessary for this D3 pattern)
      .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%') // Make it responsive
      .style('max-height', '500px')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .range([0, width])
      .domain(variables)
      .padding(0.05);

    const y = d3.scaleBand()
      .range([height, 0])
      .domain(variables)
      .padding(0.05);

    // Use d3.interpolateBlues for both light and dark themes for consistency
    const colorScale = d3.scaleSequential(d3.interpolateBlues) 
      .domain([-1, 1]); // Adjusted domain for full correlation
    // If using for a full correlation matrix (-1 to 1), a diverging scale would be better:
    // const colorScale = d3.scaleDiverging(d3.interpolateRdBu).domain([-1, 0, 1]);

    // Add X axis labels
    svg.append('g')
      .style('font-size', '10px')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll('text')
      .style('fill', textColor)
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .select(".domain").remove();

    // Add Y axis labels
    svg.append('g')
      .style('font-size', '10px')
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll('text')
      .style('fill', textColor)
      .select(".domain").remove();
      
    // Tooltip div - appended to the main container (ref.current)
    const tooltip = container.append("div")
      .attr("class", "tooltip") // Use styles from App.css
      .style("opacity", 0)
      .style("position", "absolute") // Crucial for d3.pointer positioning
      .style("pointer-events", "none");

    svg.selectAll('.heatmap-cell')
      .data(variables.flatMap((var1, i) => variables.map((var2, j) => ({ var1, var2, value: correlations[i][j] }))), d => `${d.var1}:${d.var2}`)
      .join('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => x(d.var2))
        .attr('y', d => y(d.var1))
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .style('fill', d => isNaN(d.value) ? nanColor : colorScale(d.value)) // Use new nanColor
        .style('stroke', cellStrokeDefault)
        .style('stroke-width', 0.5)
        .on('mouseover', function(event, d_cell) {
          d3.select(this).style('stroke', cellStrokeHover).style('stroke-width', 2);
          tooltip.transition().duration(200).style("opacity", .9);
          const [mx, my] = d3.pointer(event, ref.current); // Get pointer relative to main container
          tooltip.html(`${d_cell.var1} vs ${d_cell.var2}:<br/>${isNaN(d_cell.value) ? 'N/A' : d_cell.value.toFixed(2)}`)
            .style("left", (mx + 15) + "px")
            .style("top", (my - 20) + "px");
        })
        .on('mouseout', function() {
          d3.select(this).style('stroke', cellStrokeDefault).style('stroke-width', 0.5);
          tooltip.transition().duration(500).style("opacity", 0);
        });

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2) // Position title above heatmap
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', textColor)
      .text('Variable Correlation Heatmap');

  }, [data, isDarkTheme]); // Removed variables from dep array as it's constant

  // Ensure the main div has position: relative for the absolute tooltip to work correctly.
  return <div ref={ref} style={{width: '100%', height: 'auto', maxHeight: '500px', position: 'relative'}} />;
}

export default Heatmap; 