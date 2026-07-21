import json
import os
import csv

csv_file = 'app/db/indian_food_nutrition_dataset.csv'
temp_csv = 'app/db/indian_food_nutrition_dataset_temp.csv'

UNSPLASH_FALLBACKS = {
    'chicken': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=800',
    'paneer': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?auto=format&fit=crop&q=80&w=800',
    'curry': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800',
    'default': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800'
}

def get_fallback(name):
    name_l = name.lower()
    if 'chicken' in name_l or 'mutton' in name_l: return UNSPLASH_FALLBACKS['chicken']
    if 'paneer' in name_l: return UNSPLASH_FALLBACKS['paneer']
    if 'curry' in name_l: return UNSPLASH_FALLBACKS['curry']
    return UNSPLASH_FALLBACKS['default']

# Explicitly named problem foods
PROBLEM_FOODS = ["Shahi Paneer", "Kadai Paneer", "Chicken Tikka Masala", "Mutton Curry"]

updated = 0
rows = []
fieldnames = []
with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        img_path = 'app/public' + row['image']
        is_bad = False
        
        # 1. Missing local files
        if row['image'].startswith('/assets/') and not os.path.exists(img_path):
            is_bad = True
            
        # 2. Specifically named problem foods (dark circular templates)
        if row['name'] in PROBLEM_FOODS:
            is_bad = True
            
        if is_bad:
            new_url = get_fallback(row['name'])
            print(f"Replacing {row['name']} image {row['image']} with fallback URL")
            row['image'] = new_url
            updated += 1
        rows.append(row)

with open(temp_csv, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
os.replace(temp_csv, csv_file)
print(f"Cautiously updated {updated} items to Unsplash URLs.")
