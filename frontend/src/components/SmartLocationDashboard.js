// src/components/Streamgraph.js
import React, { useEffect, useState } from 'react';
import ChoroplethMap from './ChoroplethMap';
import ScatterPlot from './ScatterPlot';
import BarChart from './BarChart';
import Heatmap from './Heatmap';
import SankeyDiagram from './SankeyDiagram';
import SustainabilityChart from './SustainabilityChart';
import * as d3 from 'd3';
import { Select, MenuItem, FormControl, InputLabel, Box, Chip } from '@mui/material';

function SmartLocationDashboard() {
  const [data, setData] = useState([]);
  const [metroData, setMetroData] = useState([]);
  const [sustainabilityData, setSustainabilityData] = useState([]);
  const [selectedMetros, setSelectedMetros] = useState(['San Jose-Sunnyvale-Santa Clara, CA']);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    // Load data
    d3.csv(process.env.PUBLIC_URL + '/cleaned_sld_data.csv').then(csvData => {
      const parsedData = csvData.map(d => ({
        ...d,
        NatWalkInd: +d.NatWalkInd,
        D1A: +d.D1A,
        D1A_scaled: +d.D1A_scaled,
        Composite_VMT_scaled: +d.Composite_VMT_scaled, // Renamed from Tot_VMT_scaled for consistency
        D2A_JPHH: +d.D2A_JPHH, // For JobHousingBalance
        D3B: +d.D3B, // For IntersectionDensity
        D4A: +d.D4A, // For DistanceToTransit      
        STATEFP: d.STATEFP, // Ensure STATEFP is explicitly carried for the map
        GEOID10: d.GEOID10, // Ensure GEOID10 is carried for fallback
        Density: +d.D1A, 
        JobHousingBalance: +d.D2A_JPHH,
        IntersectionDensity: +d.D3B,
        DistanceToTransit: +d.D4A,
        Walkability: +d.NatWalkInd,
        Pct_AO0: +d.Pct_AO0, // Percentage of households with 0 cars
        Pct_AO1: +d.Pct_AO1, // Percentage of households with 1 car
        Pct_AO2p: +d.Pct_AO2p, // Percentage of households with 2+ cars
        HH: +d.HH, // Total Households
        TotPop: +d.TotPop // Total Population (alternative for link values)
      }));
      setData(parsedData);
    });
    d3.csv(process.env.PUBLIC_URL + '/metro_summary.csv').then(setMetroData);
    // Load California sustainability data
    d3.json(process.env.PUBLIC_URL + '/sustainability_data.json').then(jsonData => {
      setSustainabilityData(jsonData);
    }).catch(error => console.error("Error loading sustainability_data.json:", error));

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('isDarkTheme');
    if (savedTheme) {
      setIsDarkTheme(JSON.parse(savedTheme));
    }
  }, []);

  useEffect(() => {
    document.body.className = isDarkTheme ? 'dark-theme' : 'light-theme';
    localStorage.setItem('isDarkTheme', JSON.stringify(isDarkTheme));
  }, [isDarkTheme]);

  const filteredData = selectedMetros.length === 0
    ? data
    : data.filter(d => selectedMetros.includes(d.CBSA_Name));

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  return (
    <div className="dashboard-container">
      {/* New Top Navigation Bar */}
      <nav className="top-nav-bar">
        <div className="logo-and-title">
          <span className="logo-placeholder" role="img" aria-label="logo">📍</span>
          <h1 className="top-nav-title">Smart Location Dashboard</h1>
        </div>
        <div className="top-nav-actions">
          <button
            className="theme-toggle-button" // New class for styling
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            ⚙️ {/* Gear icon for theme toggle */}
          </button>
        </div>
      </nav>

      {/* New Header Section for Subtitle and Filters */}
      <header className="dashboard-header-section">
        <p className="dashboard-subtitle">
          Explore walkability, transit access, urban form, and transportation outcomes across the U.S.
        </p>
        <div className="filter-controls">
          <FormControl sx={{ 
            minWidth: 300,
            '& .MuiInputLabel-root': {
              backgroundColor: isDarkTheme ? '#1a202c' : '#ffffff',
              padding: '0 8px',
            },
            '& .MuiInputLabel-shrink': {
              backgroundColor: isDarkTheme ? '#1a202c' : '#ffffff',
              padding: '0 8px',
            }
          }}>
            <InputLabel id="metro-filter-label" 
              sx={{ 
                color: isDarkTheme ? '#cbd5e1' : '#4a5568',
                '&.Mui-focused': {
                  color: isDarkTheme ? '#90cdf4' : '#3182ce'
                }
              }}>
              Filter by location (impacts charts below map)
            </InputLabel>
            <Select
              labelId="metro-filter-label"
              multiple
              value={selectedMetros}
              onChange={(e) => setSelectedMetros(e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip 
                      key={value} 
                      label={value} 
                      sx={{ 
                        backgroundColor: isDarkTheme ? '#2d3748' : '#edf2f7',
                        color: isDarkTheme ? '#f7fafc' : '#2d3748',
                        '& .MuiChip-deleteIcon': {
                          color: isDarkTheme ? '#cbd5e1' : '#4a5568'
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
              sx={{
                backgroundColor: isDarkTheme ? '#1a202c' : '#ffffff',
                color: isDarkTheme ? '#f7fafc' : '#2d3748',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDarkTheme ? '#4a5568' : '#e2e8f0'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDarkTheme ? '#90cdf4' : '#3182ce'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDarkTheme ? '#90cdf4' : '#3182ce'
                },
                '& .MuiSelect-icon': {
                  color: isDarkTheme ? '#cbd5e1' : '#4a5568'
                }
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: isDarkTheme ? '#1a202c' : '#ffffff',
                    '& .MuiMenuItem-root': {
                      color: isDarkTheme ? '#f7fafc' : '#2d3748',
                      '&:hover': {
                        backgroundColor: isDarkTheme ? '#2d3748' : '#edf2f7'
                      },
                      '&.Mui-selected': {
                        backgroundColor: isDarkTheme ? '#2d3748' : '#edf2f7',
                        '&:hover': {
                          backgroundColor: isDarkTheme ? '#374151' : '#e2e8f0'
                        }
                      }
                    }
                  }
                }
              }}
            >
              <MenuItem value="all" 
                sx={{ 
                  color: isDarkTheme ? '#f7fafc' : '#2d3748',
                  '&:hover': {
                    backgroundColor: isDarkTheme ? '#2d3748' : '#edf2f7'
                  }
                }}
              >
                All Metro Areas
              </MenuItem>
              {metroData.map(d => (
                <MenuItem 
                  key={d.CBSA_Name} 
                  value={d.CBSA_Name}
                  sx={{ 
                    color: isDarkTheme ? '#f7fafc' : '#2d3748',
                    '&:hover': {
                      backgroundColor: isDarkTheme ? '#2d3748' : '#edf2f7'
                    }
                  }}
                >
                  {d.CBSA_Name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </header>

      {/* Card 1: Density vs. VMT */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <h2 className="chart-card-title">Density vs. VMT</h2>
            <p className="chart-card-subtitle">Correlation between residential density and vehicle miles traveled</p>
          </div>
        </div>
        <div className="chart-container">
          <ScatterPlot data={filteredData} isDarkTheme={isDarkTheme} />
        </div>
      </div>

      {/* Row for Card 2 and Card 3 side-by-side */}
      <div className="chart-row">
        {/* Card 2: Top Metro Areas by Walkability */}
        <div className="chart-card chart-card-half">
          <div className="chart-card-header">
            <div>
              <h2 className="chart-card-title">Top Metro Areas by Walkability</h2>
              <p className="chart-card-subtitle">Walkability comparison across metropolitan areas</p>
            </div>
          </div>
          <div className="chart-container">
            <BarChart metroData={metroData} isDarkTheme={isDarkTheme} />
          </div>
        </div>

        {/* Card 3: Correlation Heatmap */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h2 className="chart-card-title">Correlation Heatmap</h2>
              <p className="chart-card-subtitle">Correlations between selected sustainability indicators</p>
            </div>
          </div>
          <div className="chart-container" style={{ minHeight: '400px' }}> 
            <Heatmap data={filteredData} isDarkTheme={isDarkTheme} />
          </div>
        </div>
      </div>

      {/* Card 4: California Sustainability Overview */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <h2 className="chart-card-title">California Sustainability Overview</h2>
            <p className="chart-card-subtitle">Distribution of sustainability labels for regions in California.</p>
          </div>
        </div>
        <div className="chart-container" style={{ minHeight: '500px' }}>
          <SustainabilityChart data={sustainabilityData} isDarkTheme={isDarkTheme} />
        </div>
      </div>
      
      {/* Card 5: Transportation Modes vs. Walkability */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <h2 className="chart-card-title">Transportation Modes vs. Walkability</h2>
            <p className="chart-card-subtitle">Exploring how car ownership and population relate to walkability scores.</p>
          </div>
        </div>
        <div className="chart-container" style={{ minHeight: '400px' }}>
          <SankeyDiagram data={filteredData} isDarkTheme={isDarkTheme} />
        </div>
      </div>

      {/* Card 6: U.S. State Walkability Overview */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <h2 className="chart-card-title">U.S. State Walkability Overview</h2>
            <p className="chart-card-subtitle">Average Walkability Scores by State. Hover over a state for details.</p>
          </div>
        </div>
        <div className="chart-container" style={{ minHeight: '500px'}}>
          <ChoroplethMap sldData={data} isDarkTheme={isDarkTheme} />
        </div>
      </div>

    </div>
  );
}

export default SmartLocationDashboard;