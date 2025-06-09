import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import numpy as np

# Load data
# Ensure STATEFP is loaded as string to preserve leading zeros if any, though for '06' it's fine.
df = pd.read_csv('../data/EPA_SmartLocationDatabase_V3_Jan_2021_Final.csv', dtype={'STATEFP': str})

print("First 5 rows of the loaded CSV:")
print(df.head())

if 'STATEFP' in df.columns:
    print("Unique values in STATEFP column before filtering:")
    print(df['STATEFP'].unique()[:20]) # Print first 20 unique values to avoid long lists
else:
    print("Error: 'STATEFP' column not found in the CSV. Available columns are:")
    print(df.columns)
    exit()

# Filter for California (STATEFP '06' or '6')
df_ca = df[df['STATEFP'] == '6'].copy() # Use .copy() to avoid SettingWithCopyWarning

if df_ca.empty:
    print("No data found for California (STATEFP '06' or '6'). Exiting.")
    # Create an empty JSON or handle as needed
    with open('../frontend/public/sustainability_data.json', 'w') as f:
        f.write("[]")
    exit()

# Select and rename relevant features
# CSA_Name is preferred for regional aggregation. If it's often NaN, CBSA_Name could be a fallback.
# For now, we'll assume CSA_Name is sufficiently populated for CA regions.
df_ca.rename(columns={
    'CSA_Name': 'Region',
    'D1A': 'Density', # Population + employment density
    'D2A_JPHH': 'JobHousingBalance', # Jobs per household
    'D3B': 'IntersectionDensity', # Street intersection density
    'D4A': 'DistanceToTransit', # Avg distance to nearest transit stop
    'D5DRI': 'DestinationAccessibility', # Regional accessibility metric (older VMT related)
    'NatWalkInd': 'Walkability' # National Walkability Index
}, inplace=True)

# Define features for aggregation and later for clustering
numerical_features = ['Density', 'JobHousingBalance', 'IntersectionDensity', 'DistanceToTransit', 'DestinationAccessibility', 'Walkability']
core_features_for_clustering = ['Density', 'Walkability', 'JobHousingBalance', 'IntersectionDensity']


# Handle cases where 'Region' might be NaN. If so, these can't be meaningfully grouped by CSA.
# Option: Fill NaN regions with a placeholder, or drop them.
# For CA, CSAs should be fairly well-defined. We'll drop rows if 'Region' is NaN after CA filter.
df_ca.dropna(subset=['Region'] + numerical_features, inplace=True)


if df_ca.empty:
    print("No data after dropping NaNs in key columns for California. Exiting.")
    with open('../frontend/public/sustainability_data.json', 'w') as f:
        f.write("[]")
    exit()

# Group by Region and aggregate numerical features using mean
df_grouped = df_ca.groupby('Region')[numerical_features].mean().reset_index()

# Fill any NaNs that might have resulted from aggregation (if all values in a group were NaN for a feature)
# This is less likely if we dropna before grouping on numerical_features
for feature in core_features_for_clustering: # Only fill NaNs for features used in clustering
    if df_grouped[feature].isnull().any():
        df_grouped[feature].fillna(df_grouped[feature].mean(), inplace=True)

# Ensure we still have data after potential NaN fills for clustering features
df_grouped.dropna(subset=core_features_for_clustering, inplace=True)

if df_grouped.empty:
    print("No regions remaining after aggregation and NaN handling for clustering. Exiting.")
    with open('../frontend/public/sustainability_data.json', 'w') as f:
        f.write("[]")
    exit()

# Select features for scaling and clustering from the aggregated data
df_features_agg = df_grouped[core_features_for_clustering]

# Scale aggregated features
scaler = StandardScaler()
X_scaled_agg = scaler.fit_transform(df_features_agg)

# KMeans clustering on aggregated, scaled features
# Adjust n_clusters if needed, 3 (Low, Medium, High) is a common choice
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
df_grouped['SustainabilityCluster'] = kmeans.fit_predict(X_scaled_agg)

# Map cluster numbers to labels
cluster_labels = {0: 'Low', 1: 'Medium', 2: 'High'}
# Note: The assignment of 0,1,2 to Low,Medium,High depends on cluster centers.
# A more robust way is to inspect cluster centers and assign labels accordingly.
# For now, we assume this mapping. A common approach:
# centers = scaler.inverse_transform(kmeans.cluster_centers_)
# walkability_idx = core_features_for_clustering.index('Walkability')
# sorted_centers_indices = np.argsort(centers[:, walkability_idx])
# cluster_labels = {sorted_centers_indices[0]: 'Low', sorted_centers_indices[1]: 'Medium', sorted_centers_indices[2]: 'High'}

df_grouped['SustainabilityLabel'] = df_grouped['SustainabilityCluster'].map(cluster_labels)

# Prepare final output columns
output_cols = ['Region'] + numerical_features + ['SustainabilityLabel']
df_out = df_grouped[output_cols]

# --- Dynamic splitting of combined regions (e.g., "CityA-CityB-CityC, ST") ---
print("\nStarting dynamic region splitting...")
final_rows = []
regions_to_remove_after_processing = []

for index, row in df_out.iterrows():
    original_region_name = row['Region']
    # Try to split by comma first to separate city-agglomeration from state
    parts = original_region_name.split(',')
    city_part = parts[0].strip()
    state_part = f",{parts[1].strip()}" if len(parts) > 1 else "" # e.g., ", CA"

    # Check if the city_part contains hyphens (potential multi-city CSA)
    if '-' in city_part:
        individual_cities = [c.strip() for c in city_part.split('-')]
        
        if len(individual_cities) > 1: # Only split if hyphens actually separate multiple names
            print(f"  Found combined region: '{original_region_name}'. Splitting into: {individual_cities}")
            regions_to_remove_after_processing.append(original_region_name)
            
            for city_name in individual_cities:
                new_row = row.copy()
                new_row['Region'] = f"{city_name}{state_part}" # e.g., "Fresno, CA"
                final_rows.append(new_row)
            continue # Move to the next row in df_out
            
    # If not a splittable combined region, add the original row as is
    final_rows.append(row)

# Reconstruct df_out: start with rows that were not combined or were already individual
df_temp = pd.DataFrame(final_rows)

# Ensure no duplicates if a non-combined region was processed and added
df_out_final = df_temp.drop_duplicates(subset=['Region'])

print(f"Dynamic region splitting complete. Original rows: {len(df_out)}, Final rows: {len(df_out_final)}")
# --- End dynamic splitting ---

# Save as JSON for D3
df_out_final.to_json('../frontend/public/sustainability_data.json', orient='records', indent=2)

print(f"Aggregated sustainability data for California saved. Number of regions: {len(df_out_final)}")
