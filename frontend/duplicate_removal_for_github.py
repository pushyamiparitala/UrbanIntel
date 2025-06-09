import pandas as pd

# Load the CSV
df = pd.read_csv('public/cleaned_sld_data.csv')
print(df.columns)

# Keep only 2 records per CSA_NAME
deduped = df.groupby('CSA_Name').head(2)

# Save to a new CSV (or overwrite the original)
deduped.to_csv('public/cleaned_sld_data_deduped.csv', index=False)

print("Done! Saved as cleaned_sld_data_deduped.csv")