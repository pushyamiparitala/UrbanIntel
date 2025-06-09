import pandas as pd

df = pd.read_csv('data/EPA_SmartLocationDatabase_V3_Jan_2021_Final.csv')

# Rename columns for clarity
df = df.rename(columns={
    'E5_Ret': 'RetailJobs',
    'E5_Off': 'OfficeJobs',
    'E5_Ind': 'IndustrialJobs',
    'E5_Svc': 'ServiceJobs',
    'E5_Ent': 'EntertainmentJobs',
    'CSA_Name': 'Region',
    'CBSA_Name': 'City',
    'GEOID10': 'BlockGroup',
    # Add more as needed
})

# Save only relevant columns for the streamgraph
cols = ['Region', 'RetailJobs', 'OfficeJobs', 'IndustrialJobs', 'ServiceJobs', 'EntertainmentJobs']
df = df[cols]

# Group by Region and sum jobs for each sector
df_grouped = df.groupby('Region').sum().reset_index()

# Save as JSON for D3
df_grouped.to_json('public/streamgraph_data.json', orient='records')
