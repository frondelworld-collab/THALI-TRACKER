#!/usr/bin/env python3
import os
import csv
import json
import sqlite3
import argparse
import logging
from PIL import Image, ImageDraw, ImageFont

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Category mapping from CSV category string to DB Category ID/Slug
CATEGORY_MAP = {
    "grain": 1,      # Grains & Breads
    "bread": 1,      # Grains & Breads
    "legume": 4,     # Lentils & Dal
    "vegetable": 3,  # Vegetables & Sabzi
    "dairy": 5,      # Dairy
    "rice": 6,       # Rice
    "snack": 7,      # Snacks & Sides
    "beverage": 8,   # Beverages
    "sweet": 9,      # Desserts
    "meat": 2        # Proteins
}

# Category styles for Pillow image generation (premium HSL-based palettes)
CATEGORY_STYLES = {
    1: {"name": "Grains & Breads", "bg_start": (210, 180, 140), "bg_end": (139, 69, 19), "text_color": (255, 255, 255)},
    2: {"name": "Proteins", "bg_start": (205, 92, 92), "bg_end": (139, 0, 0), "text_color": (255, 255, 255)},
    3: {"name": "Vegetables & Sabzi", "bg_start": (46, 139, 87), "bg_end": (85, 107, 47), "text_color": (255, 255, 255)},
    4: {"name": "Lentils & Dal", "bg_start": (218, 165, 32), "bg_end": (184, 134, 11), "text_color": (255, 255, 255)},
    5: {"name": "Dairy", "bg_start": (220, 235, 255), "bg_end": (176, 224, 230), "text_color": (30, 80, 140)},
    6: {"name": "Rice", "bg_start": (255, 248, 220), "bg_end": (220, 220, 180), "text_color": (80, 80, 30)},
    7: {"name": "Snacks & Sides", "bg_start": (255, 140, 0), "bg_end": (255, 69, 0), "text_color": (255, 255, 255)},
    8: {"name": "Beverages", "bg_start": (32, 178, 170), "bg_end": (0, 139, 139), "text_color": (255, 255, 255)},
    9: {"name": "Desserts", "bg_start": (255, 182, 193), "bg_end": (139, 0, 139), "text_color": (255, 255, 255)}
}

DEFAULT_STYLE = {"name": "Other", "bg_start": (128, 128, 128), "bg_end": (64, 64, 64), "text_color": (255, 255, 255)}

def create_gradient_canvas(width, height, start_color, end_color):
    """Creates an image with a linear vertical gradient."""
    base = Image.new("RGB", (width, height), start_color)
    top = Image.new("RGB", (width, height), end_color)
    mask = Image.new("L", (width, height))
    for y in range(height):
        factor = int(255 * (y / height))
        mask.paste(factor, (0, y, width, y + 1))
    base.paste(top, (0, 0), mask)
    return base

def draw_stylized_placeholder(food_name, hindi_name, category_id, output_path, width=800, height=600):
    """Generates a premium visual representation of the food item using Pillow."""
    style = CATEGORY_STYLES.get(category_id, DEFAULT_STYLE)
    
    # Create background gradient
    img = create_gradient_canvas(width, height, style["bg_start"], style["bg_end"])
    draw = ImageDraw.Draw(img)
    
    # Draw plate details
    center_x, center_y = width // 2, height // 2 - 20
    radius = 180
    
    # Outer ring
    draw.ellipse(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        fill=None,
        outline=(255, 255, 255, 80),
        width=8
    )
    
    # Inner circle
    inner_radius = radius - 15
    draw.ellipse(
        [center_x - inner_radius, center_y - inner_radius, center_x + inner_radius, center_y + inner_radius],
        fill=(255, 255, 255, 30),
        outline=(255, 255, 255, 120),
        width=3
    )

    try:
        font_title = ImageFont.truetype("arial.ttf", 48)
        font_subtitle = ImageFont.truetype("arial.ttf", 32)
        font_category = ImageFont.truetype("arial.ttf", 22)
    except IOError:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_category = ImageFont.load_default()
        
    draw.text((width // 2, height - 130), food_name, fill=style["text_color"], font=font_title, anchor="mm")
    if hindi_name:
        draw.text((width // 2, height - 80), hindi_name, fill=style["text_color"], font=font_subtitle, anchor="mm")
    draw.text((width // 2, 50), style["name"].upper(), fill=style["text_color"], font=font_category, anchor="mm")
    
    img.save(output_path, "PNG")

def update_workflow(csv_path, db_path, output_dir, dry_run=False):
    if not os.path.exists(csv_path):
        logger.error(f"CSV file not found: {csv_path}")
        return
        
    if not os.path.exists(db_path):
        logger.error(f"Database file not found: {db_path}")
        return
        
    os.makedirs(output_dir, exist_ok=True)
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    manifest = {}
    csv_rows_updated = []
    headers = []
    
    inserted_count = 0
    updated_count = 0
    
    # Read the CSV
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        for row in reader:
            food_name = row.get('name')
            hindi_name = row.get('hindi_name', '')
            csv_category = row.get('category', 'vegetable')
            
            if not food_name:
                continue
                
            # Try to match in DB
            cursor.execute("SELECT id, category_id FROM foods WHERE name = ?", (food_name,))
            db_row = cursor.fetchone()
            
            category_id = CATEGORY_MAP.get(csv_category.lower(), 3)  # Default to Vegetables (3)
            
            if not db_row:
                # Insert item into DB
                calories = int(float(row.get('calories', 0)))
                protein = float(row.get('protein_g', 0))
                carbs = float(row.get('carbs_g', 0))
                fats = float(row.get('fat_g', 0))
                fiber = float(row.get('fiber_g', 0)) if row.get('fiber_g') else 0.0
                sugar = float(row.get('sugar_g', 0)) if row.get('sugar_g') else 0.0
                serving_size = row.get('serving_size', '100g')
                
                is_veg = 0 if csv_category.lower() == "meat" else 1
                is_vegan = 0
                is_gf = 1 if csv_category.lower() in ["vegetable", "dairy", "beverage", "legume"] else 0
                
                desc = f"Traditional {food_name}"
                if row.get('alternate_names'):
                    desc += f" (also known as {row.get('alternate_names')})"
                
                if not dry_run:
                    cursor.execute("""
                        INSERT INTO foods (
                            name, hindi_name, description, category_id, serving_size,
                            calories, protein, carbs, fats, fiber, sugar,
                            is_vegetarian, is_vegan, is_gluten_free, meal_type, is_popular, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'any', 0, strftime('%s', 'now')*1000)
                    """, (food_name, hindi_name, desc, category_id, serving_size,
                          calories, protein, carbs, fats, fiber, sugar, is_veg, is_vegan, is_gf))
                    item_id = cursor.lastrowid
                    inserted_count += 1
                else:
                    item_id = 9999 + inserted_count
                    inserted_count += 1
            else:
                item_id, category_id = db_row
                updated_count += 1
                
            # Define image path and file name
            file_name = f"food_{item_id}.png"
            output_path = os.path.join(output_dir, file_name)
            relative_img_path = f"/{file_name}"
            
            # Generate image
            if not dry_run:
                draw_stylized_placeholder(food_name, hindi_name, category_id, output_path)
                # Update DB image field
                cursor.execute("UPDATE foods SET image = ? WHERE id = ?", (relative_img_path, item_id))
                
            manifest[food_name] = {
                "id": item_id,
                "image_path": relative_img_path,
                "category_id": category_id,
                "status": "inserted" if not db_row else "updated"
            }
            
            # Update CSV Row
            row_copy = dict(row)
            # We don't have a direct 'image' column in the CSV schema, but let's check
            # We can write the updated path or just logs.
            csv_rows_updated.append(row_copy)
            
    if not dry_run:
        conn.commit()
        # Save manifest
        manifest_path = os.path.join(output_dir, "manifest.json")
        with open(manifest_path, 'w', encoding='utf-8') as mf:
            json.dump(manifest, mf, indent=2)
        logger.info(f"Manifest saved to {manifest_path}")
        
    conn.close()
    
    logger.info("=== Sync Completed ===")
    logger.info(f"Database records matching and updated: {updated_count}")
    logger.info(f"New database records inserted from CSV: {inserted_count}")
    logger.info(f"Total images generated: {inserted_count + updated_count}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Indian Food Nutrition Database Image Sync and Update Workflow")
    parser.add_argument("--csv", default="db/indian_food_nutrition_dataset.csv", help="Path to the source CSV dataset")
    parser.add_argument("--db", default="sqlite.db", help="Path to sqlite.db database")
    parser.add_argument("--output", default="public", help="Output folder to store generated images")
    parser.add_argument("--dry-run", action="store_true", help="Simulate workflow without modifying files or database")
    
    args = parser.parse_args()
    update_workflow(args.csv, args.db, args.output, args.dry_run)
