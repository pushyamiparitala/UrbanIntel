import pandas as pd
import numpy as np
import geopandas as gpd
from sklearn.preprocessing import StandardScaler
import os
from pathlib import Path

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# File paths
CSV_PATH = PROJECT_ROOT / "data/EPA_SmartLocationDatabase_V3_Jan_2021_Final.csv"
CLEANED_CSV = PROJECT_ROOT / "frontend/public/cleaned_sld_data.csv"
METRO_CSV = PROJECT_ROOT / "frontend/public/metro_summary.csv"
GEOJSON_OUT = PROJECT_ROOT / "frontend/public/cleaned_sld_geo.json"
SHAPEFILE_PATH = PROJECT_ROOT / "data/EPA_SmartLocationDatabase_V3_Jan_2021_Final.csv"  # If you have the shapefile

# Create output directory if it doesn't exist
os.makedirs(PROJECT_ROOT / "frontend/public", exist_ok=True)

# Step 1: Load data
df = pd.read_csv(CSV_PATH, low_memory=False)

# Step 2: Data Cleaning
critical_columns = ['NatWalkInd', 'D1A', 'D3B', 'D4A', 'D5AR', 'D5AE', 'TotPop', 'TotEmp', 'CBSA_Name', 'GEOID10']
df = df.dropna(subset=critical_columns)

# Remove outliers using IQR
def remove_outliers(df, column):
    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)
    IQR = Q3 - Q1
    lower = Q1 - 1.5 * IQR
    upper = Q3 + 1.5 * IQR
    return df[(df[column] >= lower) & (df[column] <= upper)]

for col in ['D1A', 'D3B', 'D4A', 'D5AR', 'D5AE']:
    df = remove_outliers(df, col)

# Step 3: Data Transformation
scaler = StandardScaler()
df[['D1A_scaled', 'D3B_scaled', 'D4A_scaled', 'Composite_VMT_scaled']] = scaler.fit_transform(
    df[['D1A', 'D3B', 'D4A', 'D5AR']]
)

# Categorize walkability
df['Walkability_Category'] = pd.cut(
    df['NatWalkInd'],
    bins=[-np.inf, 5, 10, np.inf],
    labels=['Low', 'Medium', 'High']
)

# Calculate composite VMT (most accurate for total block group VMT)
df['Composite_VMT'] = (
    df['D5AR'].fillna(0) * df['TotPop'].fillna(0) +
    df['D5AE'].fillna(0) * df['TotEmp'].fillna(0)
)

# Step 4: Aggregate by metro area
metro_summary = df.groupby('CBSA_Name').agg({
    'NatWalkInd': 'mean',
    'D4A': 'mean',
    'Composite_VMT': 'mean'
}).reset_index()

# Step 5: Export cleaned data
df.to_csv(CLEANED_CSV, index=False)
metro_summary.to_csv(METRO_CSV, index=False)

# Step 6: Export GeoJSON (if shapefile is available)
try:
    gdf = gpd.read_file(SHAPEFILE_PATH)
    gdf = gdf.merge(df[['GEOID10', 'NatWalkInd', 'D4A', 'Walkability_Category']], left_on='GEOID10', right_on='GEOID10')
    gdf.to_file(GEOJSON_OUT, driver='GeoJSON')
    print(f"GeoJSON exported to {GEOJSON_OUT}")
except Exception as e:
    print("GeoJSON export skipped (shapefile not found or merge failed):", e)

print("Data cleaning and export complete.")
print(f"Files saved: {CLEANED_CSV}, {METRO_CSV}")
