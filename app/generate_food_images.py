#!/usr/bin/env python3
import os
import csv
import json
import sqlite3
import argparse
import logging
import re
import requests
import base64
import time
from PIL import Image, ImageDraw, ImageFont, ImageFilter

try:
    from google import genai
    from google.genai import types as genai_types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

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

CATEGORY_NAMES = {
    1: "Grains & Breads",
    2: "Proteins",
    3: "Vegetables & Sabzi",
    4: "Lentils & Dal",
    5: "Dairy",
    6: "Rice",
    7: "Snacks & Sides",
    8: "Beverages",
    9: "Desserts"
}

# Authentic Indian serving ware mapping by keywords or categories
SERVING_WARE_MAP = {
    "chapati": "a rustic griddle or a warm cotton cloth in a wicker basket",
    "roti": "a rustic metal plate",
    "naan": "a warm dark wooden serving board",
    "dosa": "a fresh green banana leaf",
    "idli": "a fresh green banana leaf",
    "uttapam": "a fresh green banana leaf",
    "poha": "a rustic brass plate",
    "upma": "a small terracotta bowl",
    "puri bhaji": "a steel thali",
    "bhatura": "a rustic brass platter",
    "puri": "a rustic metal plate",
    "chicken": "a traditional copper bowl or black clay handi",
    "mutton": "a deep black clay handi",
    "fish": "a fresh green banana leaf",
    "egg": "a small copper bowl",
    "kebab": "a dark stone platter with mint chutney on the side",
    "tikka": "a sizzling iron platter",
    "aloo": "a black clay bowl",
    "bhindi": "a rustic terracotta pot",
    "baingan": "a traditional brass bowl",
    "sabzi": "a rustic black clay bowl",
    "dal": "a traditional copper bowl",
    "chole": "a rustic copper handi",
    "rajma": "a black ceramic bowl",
    "sambhar": "a traditional brass bowl",
    "rasam": "a small terracotta tumbler",
    "kadhi": "a small clay bowl",
    "paneer": "a traditional copper bowl",
    "raita": "a small terracotta bowl",
    "chai": "an authentic clay cup (kulhad)",
    "coffee": "a traditional brass tumbler and davarah set",
    "lassi": "a tall traditional brass tumbler",
    "pani": "a transparent vintage glass",
    "jamun": "an authentic terracotta bowl",
    "rasgulla": "a small clay bowl",
    "kheer": "a small brass bowl",
    "halwa": "a brass bowl",
    "jalebi": "a rustic metal tray",
    "rasmalai": "a small terracotta dish",
    "kulfi": "a wooden stick placed on a brass plate",
    "laddoo": "a silver-trimmed brass platter",
    "katli": "a silver-trimmed brass platter",
    "peda": "a small brass platter",
}

DEFAULT_WARE_MAP = {
    1: "a rustic metal plate",
    2: "a copper bowl",
    3: "a black clay bowl",
    4: "a traditional copper bowl",
    5: "a brass bowl",
    6: "a steel thali",
    7: "a terracotta plate",
    8: "a clay cup (kulhad)",
    9: "a small brass bowl"
}

# Pillow fallback rendering configuration (premium dark wood themes)
PALETTES = {
    "dark_wood": {
        "wood_base": (45, 30, 20),      # Dark chocolate brown
        "wood_grain": (30, 18, 10),     # Almost black wood lines
        "highlight": (95, 60, 40),      # Warm glow highlight
        "shadow": (15, 10, 5),          # Deep shadow
        "plate_metal": (160, 140, 120),  # Vintage brass/copper
        "plate_clay": (180, 90, 50),     # Terracotta
        "plate_leaf": (46, 125, 50),     # Banana leaf green
    }
}

def sanitize_filename(name):
    """Sanitizes food names for filenames (e.g. 'Basmati Rice (Steamed)' -> 'basmati_rice_steamed')"""
    name = name.lower()
    name = re.sub(r'[\(\)]', '', name)  # Remove parentheses
    name = re.sub(r'[^a-z0-9\s-]', '', name)  # Keep alphanumeric, space, dash
    name = re.sub(r'[\s-]+', '_', name)  # Replace spaces and dashes with underscores
    return name.strip('_')

def get_serving_ware(food_name, category_id):
    """Determines appropriate Indian serving ware for a food item."""
    name_lower = food_name.lower()
    for kw, ware in SERVING_WARE_MAP.items():
        if kw in name_lower:
            return ware
    return DEFAULT_WARE_MAP.get(category_id, "a rustic clay plate")

def generate_pillow_fallback(food_name, hindi_name, category_id, serving_ware, output_jpg_path, output_webp_path, width=1200, height=800):
    """Generates a premium dark-moody editorial placeholder image using Pillow."""
    palette = PALETTES["dark_wood"]
    
    # 1. Create dark wooden background canvas
    base = Image.new("RGB", (width, height), palette["wood_base"])
    draw = ImageDraw.Draw(base)
    
    # Draw subtle wooden planks/grain lines
    num_planks = 6
    plank_width = height // num_planks
    for i in range(num_planks + 1):
        y = i * plank_width
        # Draw plank divider line
        draw.line([(0, y), (width, y)], fill=palette["wood_grain"], width=3)
        # Draw subtle grain details within planks
        for offset in [15, 45, 80]:
            if y + offset < height:
                draw.line([(0, y + offset), (width, y + offset)], fill=(38, 25, 16), width=1)
                
    # Add a warm radial spotlight gradient from top-left (directional lighting)
    gradient = Image.new("L", (width, height), 0)
    g_draw = ImageDraw.Draw(gradient)
    # Highlight center top-left
    cx, cy = int(width * 0.25), int(height * 0.25)
    max_radius = int(max(width, height) * 1.2)
    for r in range(max_radius, 0, -8):
        alpha = int(140 * (1 - (r / max_radius) ** 1.5))
        alpha = max(0, min(alpha, 255))
        g_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=alpha)
        
    # Create the glow overlay
    glow = Image.new("RGB", (width, height), palette["highlight"])
    base = Image.composite(glow, base, gradient)
    draw = ImageDraw.Draw(base)
    
    # 2. Draw serving ware plate / bowl based on prompt description
    plate_x, plate_y = width // 2 + 100, height // 2  # Offset to right to leave negative space on left for UI
    radius = 220
    
    # Determine plate colors
    if "leaf" in serving_ware:
        plate_color = palette["plate_leaf"]
        plate_outline = (30, 80, 30)
        shape_type = "banana_leaf"
    elif "clay" in serving_ware or "terracotta" in serving_ware:
        plate_color = palette["plate_clay"]
        plate_outline = (130, 60, 30)
        shape_type = "clay_pot"
    else: # brass / metal / copper / steel
        plate_color = palette["plate_metal"]
        plate_outline = (120, 105, 90)
        shape_type = "metal_plate"
        
    # Draw drop shadow under plate
    shadow_offset_x = 25
    shadow_offset_y = 25
    shadow = Image.new("L", (width, height), 0)
    s_draw = ImageDraw.Draw(shadow)
    
    if shape_type == "banana_leaf":
        # Draw leaf shape for shadow
        leaf_box = [plate_x - radius - 20, plate_y - radius + 30, plate_x + radius + 20, plate_y + radius - 30]
        s_draw.ellipse(leaf_box, fill=120)
    else:
        s_draw.ellipse([plate_x - radius, plate_y - radius, plate_x + radius, plate_y + radius], fill=120)
        
    # Blur the shadow for realistic soft depth
    shadow_blurred = shadow.filter(ImageFilter.GaussianBlur(radius=25))
    shadow_color = Image.new("RGB", (width, height), palette["shadow"])
    base = Image.composite(base, shadow_color, shadow_blurred)
    draw = ImageDraw.Draw(base)
    
    # Draw the actual serving ware
    if shape_type == "banana_leaf":
        # Banana leaf shape (curved polygon or rounded ellipse)
        leaf_pts = [
            (plate_x - radius - 40, plate_y),
            (plate_x - radius, plate_y - radius + 60),
            (plate_x + radius, plate_y - radius + 80),
            (plate_x + radius + 40, plate_y),
            (plate_x + radius, plate_y + radius - 80),
            (plate_x - radius, plate_y + radius - 60)
        ]
        draw.polygon(leaf_pts, fill=plate_color, outline=plate_outline)
        # Leaf veins
        for vx in range(plate_x - radius, plate_x + radius, 30):
            draw.line([(vx, plate_y - 80), (vx + 20, plate_y + 80)], fill=(76, 175, 80), width=2)
    elif shape_type == "clay_pot":
        # Terracotta bowl (thick rim, warm color)
        draw.ellipse([plate_x - radius, plate_y - radius, plate_x + radius, plate_y + radius], fill=plate_color, outline=plate_outline, width=4)
        draw.ellipse([plate_x - radius + 20, plate_y - radius + 20, plate_x + radius - 20, plate_y + radius - 20], fill=(150, 75, 40), outline=plate_outline, width=2)
    else:
        # Brass / copper metallic thali
        draw.ellipse([plate_x - radius, plate_y - radius, plate_x + radius, plate_y + radius], fill=plate_color, outline=plate_outline, width=6)
        # Inner metallic rings
        draw.ellipse([plate_x - radius + 15, plate_y - radius + 15, plate_x + radius - 15, plate_y + radius - 15], fill=None, outline=(180, 160, 140), width=2)
        draw.ellipse([plate_x - radius + 30, plate_y - radius + 30, plate_x + radius - 30, plate_y + radius - 30], fill=(90, 75, 60), outline=(50, 40, 30), width=1)
        
    # Draw a stylized representation of food inside the plate (layered circles/shapes representing food texture)
    food_radius = radius - 45
    food_color = (210, 105, 30)  # Curry orange
    if category_id == 1:  # Grains & Breads: golden yellow/brown
        food_color = (220, 175, 100)
    elif category_id == 2:  # Proteins: rich red/brown
        food_color = (180, 50, 40)
    elif category_id == 3:  # Vegetables: green/orange mix
        food_color = (76, 110, 50)
    elif category_id == 4:  # Lentils/Dal: bright yellow/mustard
        food_color = (225, 160, 40)
    elif category_id == 6:  # Rice: off-white/jeera brown
        food_color = (245, 240, 230)
    elif category_id == 8:  # Beverage: orange/light yellow/white
        food_color = (250, 220, 160)
    elif category_id == 9:  # Desserts: pink/gold
        food_color = (240, 128, 128)
        
    # Draw food body
    draw.ellipse([plate_x - food_radius, plate_y - food_radius, plate_x + food_radius, plate_y + food_radius], fill=food_color)
    
    # Food textures/details (simulate garnish like coriander, cream, oil drizzle)
    garnish_draw = ImageDraw.Draw(base)
    # Add green coriander sprinkles
    import random
    random.seed(len(food_name))
    for _ in range(15):
        gx = plate_x + random.randint(-food_radius+30, food_radius-30)
        gy = plate_y + random.randint(-food_radius+30, food_radius-30)
        if (gx - plate_x)**2 + (gy - plate_y)**2 < (food_radius - 20)**2:
            garnish_draw.ellipse([gx - 4, gy - 4, gx + 4, gy + 4], fill=(46, 125, 50))
            
    # Add cream swirl
    if category_id in [2, 4, 5]: # Curries
        cream_mask = Image.new("L", (width, height), 0)
        c_draw = ImageDraw.Draw(cream_mask)
        c_draw.arc([plate_x - 70, plate_y - 70, plate_x + 70, plate_y + 70], start=0, end=270, fill=220, width=6)
        cream_blurred = cream_mask.filter(ImageFilter.GaussianBlur(radius=3))
        cream_color = Image.new("RGB", (width, height), (255, 253, 240))
        base = Image.composite(cream_color, base, cream_blurred)
        draw = ImageDraw.Draw(base)
        
    # 3. Add typographic editorial overlays (generous negative space on the left)
    try:
        font_serif = ImageFont.truetype("playfair.ttf", 46)
        font_sans = ImageFont.truetype("arial.ttf", 20)
        font_hindi = ImageFont.truetype("mangal.ttf", 30)
    except IOError:
        try:
            font_serif = ImageFont.truetype("georgia.ttf", 46)
            font_sans = ImageFont.truetype("arial.ttf", 20)
            font_hindi = ImageFont.truetype("arial.ttf", 30)
        except IOError:
            font_serif = ImageFont.load_default()
            font_sans = ImageFont.load_default()
            font_hindi = ImageFont.load_default()
            
    # Draw visual tags (category uppercase)
    cat_text = CATEGORY_NAMES.get(category_id, "INDIAN DISH").upper()
    draw.text((80, height // 2 - 120), cat_text, fill=(217, 119, 6), font=font_sans)
    
    # Draw food English name (serif, elegant)
    # Wrap text if too long
    words = food_name.split()
    line1, line2 = "", ""
    if len(words) > 2:
        line1 = " ".join(words[:2])
        line2 = " ".join(words[2:])
    else:
        line1 = food_name
        
    draw.text((80, height // 2 - 80), line1, fill=(255, 255, 255), font=font_serif)
    if line2:
        draw.text((80, height // 2 - 25), line2, fill=(255, 255, 255), font=font_serif)
        hindi_y = height // 2 + 40
    else:
        hindi_y = height // 2 - 15
        
    # Draw Hindi name
    if hindi_name:
        draw.text((80, hindi_y), hindi_name, fill=(230, 220, 200), font=font_hindi)
        
    # Add a thin separator line
    draw.line([(80, hindi_y + 60), (280, hindi_y + 60)], fill=(217, 119, 6, 120), width=2)
    
    # Draw authentic editorial caption
    caption = f"Authentically prepared {food_name.lower()}, served on {serving_ware}."
    if len(caption) > 45:
        caption_line1 = caption[:42] + "..."
    else:
        caption_line1 = caption
    draw.text((80, hindi_y + 80), caption_line1, fill=(180, 170, 160), font=font_sans)
    
    # Save the output images
    os.makedirs(os.path.dirname(os.path.abspath(output_jpg_path)), exist_ok=True)
    base.save(output_jpg_path, "JPEG", quality=90)
    
    # Convert and save as WebP with file size optimization (<200KB check)
    base.save(output_webp_path, "WEBP", quality=80)
    
    # Check WebP size and adjust quality if needed
    webp_size = os.path.getsize(output_webp_path)
    if webp_size > 200 * 1024:
        # Re-save with lower quality to compress below 200KB
        base.save(output_webp_path, "WEBP", quality=55)
        
    return True

def call_gemini_imagen_api(prompt, api_key):
    """Calls Google Gemini nano-banana-pro-preview via genai SDK to generate an image."""
    if not GENAI_AVAILABLE:
        logger.error("google-genai SDK not available. Install with: pip install google-genai")
        return None
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_images(
                model='nano-banana-pro-preview',
                prompt=prompt,
                config=genai_types.GenerateImagesConfig(
                    number_of_images=1,
                    output_mime_type='image/jpeg',
                    aspect_ratio='1:1',
                    person_generation='DONT_ALLOW'
                )
            )
            if response.generated_images:
                return response.generated_images[0].image.image_bytes
            else:
                logger.error("nano-banana-pro-preview returned no images.")
                break
        except Exception as e:
            err_str = str(e)
            if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str:
                wait_time = (attempt + 1) * 6
                logger.warning(f"Rate limited. Retrying in {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(wait_time)
            else:
                logger.error(f"nano-banana-pro-preview API error: {e}")
                break
    return None

def call_openai_dalle_api(prompt, api_key):
    """Calls OpenAI DALL-E 3 API to generate an image."""
    url = "https://api.openai.com/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "response_format": "b64_json"
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        if response.status_code == 200:
            result = response.json()
            img_b64 = result['data'][0]['b64_json']
            return base64.b64decode(img_b64)
        else:
            logger.error(f"OpenAI DALL-E API error: status {response.status_code}, response: {response.text}")
    except Exception as e:
        logger.error(f"OpenAI DALL-E API request failed: {e}")
    return None

def call_stability_api(prompt, api_key):
    """Calls Stability AI SDXL / SD3 API to generate an image."""
    url = "https://api.stability.ai/v2beta/stable-image/generate/core"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "accept": "image/*"
    }
    # For Core/SD3 we pass multipart form data
    files = {
        "prompt": (None, prompt),
        "output_format": (None, "webp"),
        "aspect_ratio": (None, "1:1")
    }
    
    try:
        response = requests.post(url, headers=headers, files=files, timeout=45)
        if response.status_code == 200:
            return response.content
        else:
            logger.error(f"Stability API error: status {response.status_code}, response: {response.text}")
    except Exception as e:
        logger.error(f"Stability API request failed: {e}")
    return None

def call_wikimedia_api(food_name):
    """Searches Wikimedia Commons for the food name and returns its image bytes."""
    # Clean the name to remove parentheses and slash options
    clean_name = food_name
    clean_name = re.sub(r'[\(\)]', '', clean_name) # Remove parentheses
    # Remove alternative/secondary slashes
    clean_name = re.sub(r'/[^/]+$', '', clean_name) 
    clean_name = clean_name.replace("/", " ").replace("-", " ")
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()
    
    queries = [f"{clean_name} food", clean_name, f"{clean_name} dish"]
    headers = {
        'User-Agent': 'IndianCalorieTrackerFoodPhotographyBot/1.1 (https://github.com/my-project; contact-calorie-app@example.org) PythonRequests/2.31'
    }
    
    for query in queries:
        search_url = (
            "https://commons.wikimedia.org/w/api.php"
            "?action=query"
            "&list=search"
            "&srsearch=" + requests.utils.quote(query) +
            "&srnamespace=6"  # Files
            "&format=json"
            "&srlimit=10"
        )
        try:
            time.sleep(1.0)
            r = requests.get(search_url, headers=headers, timeout=10)
            if r.status_code != 200:
                continue
            data = r.json()
            search_results = data.get("query", {}).get("search", [])
            
            valid_title = None
            for res in search_results:
                title = res["title"]
                title_lower = title.lower()
                if any(title_lower.endswith(ext) for ext in [".jpg", ".jpeg", ".png"]):
                    if not any(bad in title_lower for bad in ["icon", "map", "flag", "logo", "drawing", "illustration", "vector", "schematic", "wiki"]):
                        valid_title = title
                        break
                        
            if valid_title:
                info_url = (
                    "https://commons.wikimedia.org/w/api.php"
                    "?action=query"
                    "&titles=" + requests.utils.quote(valid_title) +
                    "&prop=imageinfo" +
                    "&iiprop=url" +
                    "&format=json"
                )
                time.sleep(1.0)
                r_info = requests.get(info_url, headers=headers, timeout=10)
                if r_info.status_code == 200:
                    info_data = r_info.json()
                    pages = info_data.get("query", {}).get("pages", {})
                    for pid in pages:
                        imageinfo = pages[pid].get("imageinfo", [])
                        if imageinfo:
                            img_url = imageinfo[0]["url"]
                            time.sleep(1.0)
                            r_img = requests.get(img_url, headers=headers, timeout=15)
                            if r_img.status_code == 200:
                                logger.info(f"  Successfully found Wikimedia image: {valid_title}")
                                return r_img.content
        except Exception as e:
            logger.error(f"Error querying Wikimedia for query '{query}': {e}")
            
    return None

def main_workflow(csv_path, db_path, output_dir, style_prompt_path, api_key=None, api_type="pillow", update_cms=False, dry_run=False):
    # Determine configuration directories
    parent_dir = os.path.dirname(output_dir.rstrip('/\\'))
    if not parent_dir:
        parent_dir = "."
    manifest_path = os.path.join(parent_dir, "manifest.json")
    failed_log_path = os.path.join(parent_dir, "failed_items.log")
    
    logger.info(f"Using manifest path: {manifest_path}")
    logger.info(f"Using failed log path: {failed_log_path}")
    
    # 1. Read style-locked prompt template
    if not os.path.exists(style_prompt_path):
        logger.error(f"Style prompt file not found: {style_prompt_path}")
        return
        
    with open(style_prompt_path, 'r', encoding='utf-8') as f:
        prompt_template = f.read().strip()
        
    logger.info(f"Loaded prompt template: {prompt_template}")
    
    # Load master prompts JSON if it exists
    master_prompts = {}
    master_prompts_path = os.path.join(os.path.dirname(style_prompt_path), "master_prompts.json")
    if os.path.exists(master_prompts_path):
        try:
            with open(master_prompts_path, 'r', encoding='utf-8') as f:
                master_prompts = json.load(f)
            logger.info(f"Loaded {len(master_prompts)} master prompts from {master_prompts_path}")
        except Exception as e:
            logger.error(f"Failed to load master prompts from {master_prompts_path}: {e}")
            
    # 2. Check source CSV dataset
    if not os.path.exists(csv_path):
        logger.error(f"CSV file not found: {csv_path}")
        return
        
    # Read the CSV rows
    csv_rows = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            csv_rows.append(row)
            
    logger.info(f"Loaded {len(csv_rows)} items from CSV.")
    
    # 3. Read SQLite Database to match item IDs
    db_items = {}
    conn = None
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path, timeout=30.0)
            cursor = conn.cursor()
            # Get existing items to fetch correct IDs and categories
            cursor.execute("SELECT id, name, category_id FROM foods")
            for fid, fname, cid in cursor.fetchall():
                db_items[fname.lower()] = {"id": fid, "category_id": cid}
            logger.info(f"Loaded {len(db_items)} items from SQLite database.")
        except Exception as e:
            logger.error(f"Failed to connect to sqlite db: {e}")
            
    # Load or initialize manifest.json
    manifest = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, 'r', encoding='utf-8') as mf:
                manifest = json.load(mf)
        except Exception as e:
            logger.error(f"Error loading existing manifest: {e}")
            
    # Prepare directories
    if not dry_run:
        os.makedirs(output_dir, exist_ok=True)
        
    success_count = 0
    failed_count = 0
    fallback_count = 0
    failed_logs = []
    
    updated_csv_rows = []
    
    # Loop over CSV items
    for idx, row in enumerate(csv_rows):
        food_name = row.get('name')
        hindi_name = row.get('hindi_name', '')
        csv_cat = row.get('category', 'vegetable')
        
        if not food_name:
            continue
            
        # Skip if already successfully generated and verified in manifest (disabled to force regeneration)
        # if food_name in manifest and manifest[food_name].get("generation_status") == "success" and manifest[food_name].get("verification_flag", False):
        #     logger.info(f"Skipping '{food_name}': already generated and approved in manifest.")
        #     csv_row_copy = dict(row)
        #     # Retain the exact image path in CSV
        #     csv_row_copy["image"] = manifest[food_name]["image_path"]
        #     updated_csv_rows.append(csv_row_copy)
        #     continue
            
            
        # Match ID
        db_match = db_items.get(food_name.lower())
        if db_match:
            item_id = db_match["id"]
            category_id = db_match["category_id"]
        else:
            # If not in DB, use auto-increment projection (mock/new ID)
            item_id = 200 + idx
            category_id = CATEGORY_MAP.get(csv_cat.lower(), 3)
            
        sanitized_name = sanitize_filename(food_name)
        padded_id = f"{item_id:03d}"
        
        # File Names & Paths
        jpg_filename = f"{padded_id}_{sanitized_name}.jpg"
        webp_filename = f"{padded_id}_{sanitized_name}.webp"
        
        jpg_output_path = os.path.join(output_dir, jpg_filename)
        webp_output_path = os.path.join(output_dir, webp_filename)
        
        # Paths stored in CSV and Database (relative to public directory)
        relative_jpg_path = f"/assets/images/{jpg_filename}"
        relative_webp_path = f"/assets/images/{webp_filename}"
        
        # Get serving ware and build prompt
        serving_ware = get_serving_ware(food_name, category_id)
        
        prompt = None
        for key, val in master_prompts.items():
            if key.lower().strip() == food_name.lower().strip():
                prompt = val
                break
                
        if not prompt:
            prompt = prompt_template.replace("[FOOD_ITEM_NAME]", food_name).replace("[SERVING_WARE]", serving_ware)
        
        logger.info(f"Processing #{padded_id}: '{food_name}'")
        logger.info(f"  Prompt: '{prompt}'")
        
        status = "pending"
        
        if dry_run:
            logger.info(f"  [DRY RUN] Would generate image and save to {jpg_output_path} / {webp_output_path}")
            status = "dry_run"
            success_count += 1
        else:
            img_data = None
            
            # Call selected generation API
            if api_type == "wikimedia":
                img_data = call_wikimedia_api(food_name)
            elif api_key:
                if api_type == "gemini":
                    img_data = call_gemini_imagen_api(prompt, api_key)
                elif api_type == "openai":
                    img_data = call_openai_dalle_api(prompt, api_key)
                elif api_type == "stability":
                    img_data = call_stability_api(prompt, api_key)
                    
            if img_data:
                # Save generated image to files
                try:
                    # Write temporary original file
                    temp_orig_path = jpg_output_path + ".tmp"
                    with open(temp_orig_path, 'wb') as tf:
                        tf.write(img_data)
                        
                    # Open with Pillow for formatting/optimization
                    with Image.open(temp_orig_path) as pil_img:
                        # Center crop to 1:1 square
                        width, height = pil_img.size
                        edge = min(width, height)
                        left = (width - edge) // 2
                        top = (height - edge) // 2
                        right = (width + edge) // 2
                        bottom = (height + edge) // 2
                        pil_img = pil_img.crop((left, top, right, bottom))
                        
                        pil_img = pil_img.resize((1024, 1024), Image.Resampling.LANCZOS)
                        
                        # Save as JPG
                        pil_img.save(jpg_output_path, "JPEG", quality=90)
                        # Convert to WebP and compress (<200KB check)
                        pil_img.save(webp_output_path, "WEBP", quality=80)
                        
                        webp_size = os.path.getsize(webp_output_path)
                        if webp_size > 200 * 1024:
                            pil_img.save(webp_output_path, "WEBP", quality=55)
                            
                    # Remove temp file
                    os.remove(temp_orig_path)
                    
                    status = "success"
                    success_count += 1
                    logger.info(f"  Successfully generated AI image!")
                except Exception as e:
                    logger.error(f"  Failed to save generated image: {e}")
                    img_data = None  # Force Pillow fallback
                    
            if not img_data:
                # Fallback to local premium Pillow drawing
                try:
                    generate_pillow_fallback(food_name, hindi_name, category_id, serving_ware, jpg_output_path, webp_output_path)
                    status = "fallback"
                    fallback_count += 1
                    logger.info(f"  Generated moody visual fallback.")
                except Exception as e:
                    status = "failed"
                    failed_count += 1
                    logger.error(f"  Pillow fallback rendering failed: {e}")
                    failed_logs.append(f"{padded_id} - {food_name}: {e}")
                    
            # 4. Sync SQLite database
            if update_cms and status in ["success", "fallback"] and conn:
                try:
                    db_cursor = conn.cursor()
                    # Store webp path in DB as primary optimized image
                    db_cursor.execute("UPDATE foods SET image = ? WHERE id = ?", (relative_webp_path, item_id))
                    conn.commit()
                    logger.info(f"  Updated SQLite DB path to: {relative_webp_path}")
                except Exception as e:
                    logger.error(f"  DB Update failed: {e}")
                    failed_logs.append(f"DB Update failed for ID {item_id}: {e}")
                    
        # Update manifest record
        # Retain existing verification flags if present
        existing_flag = False
        if food_name in manifest:
            existing_flag = manifest[food_name].get("verification_flag", False)
            
        manifest[food_name] = {
            "id": item_id,
            "name": food_name,
            "image_path": relative_webp_path,
            "jpg_path": relative_jpg_path,
            "category_id": category_id,
            "generation_status": status,
            "verification_flag": existing_flag,
            "prompt": prompt,
            "serving_ware": serving_ware
        }
        
        # 5. Prepare CSV sync row
        csv_row_copy = dict(row)
        csv_row_copy["image"] = relative_webp_path
        updated_csv_rows.append(csv_row_copy)
        
    # Write updated CSV
    if not dry_run:
        # Check fieldnames, ensure 'image' column is in headers
        if "image" not in fieldnames:
            fieldnames.append("image")
            
        with open(csv_path, mode='w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_csv_rows)
        logger.info(f"Updated CSV dataset written with 'image' paths column.")
        
        # Save manifest
        with open(manifest_path, 'w', encoding='utf-8') as mf:
            json.dump(manifest, mf, indent=2)
        logger.info(f"Staging manifest written to {manifest_path}")
        
        # Save failed logs
        with open(failed_log_path, 'w', encoding='utf-8') as fl:
            if failed_logs:
                fl.write("\n".join(failed_logs))
            else:
                fl.write("All food items processed successfully.")
        logger.info(f"Logs written to {failed_log_path}")
        
        # Commit DB updates
        if update_cms and conn:
            conn.commit()
            logger.info("SQLite database transactions committed.")
            
    if conn:
        conn.close()
        
    logger.info("=== Generation Sync Completed ===")
    logger.info(f"Success (AI Generated): {success_count}")
    logger.info(f"Fallback (Pillow Rendered): {fallback_count}")
    logger.info(f"Failed: {failed_count}")
    logger.info(f"Total processed: {len(csv_rows)}")

if __name__ == "__main__":
    # Lookup environment GEMINI_API_KEY as primary fallback
    env_gemini_key = os.environ.get("GEMINI_API_KEY", "")
    
    parser = argparse.ArgumentParser(description="High-Quality Food Photography Generation and Synchronization CLI")
    parser.add_argument("--csv", default="db/indian_food_nutrition_dataset.csv", help="Path to the source CSV dataset")
    parser.add_argument("--db", default="sqlite.db", help="Path to sqlite.db database")
    parser.add_argument("--output", default="public/assets/images", help="Output directory to save images")
    parser.add_argument("--style-prompt", default="config/editorial_dark_moody.txt", help="Path to prompt style template")
    parser.add_argument("--api-key", default=env_gemini_key, help="API Key for generation service (Gemini Imagen, DALL-E, Stability)")
    parser.add_argument("--api-type", default="wikimedia", choices=["gemini", "openai", "stability", "pillow", "wikimedia"], help="API provider to execute (defaults to wikimedia if no key provided)")
    parser.add_argument("--update-cms", action="store_true", help="Commit image URL updates to SQLite database")
    parser.add_argument("--dry-run", action="store_true", help="Perform simulation dry run without making API calls or modifying database")
    
    args = parser.parse_args()
    
    active_api_key = args.api_key
    active_api_type = args.api_type
    
    # If no api-key is found/provided and type was one of key-based APIs, fallback to wikimedia
    if not active_api_key and active_api_type in ["gemini", "openai", "stability"]:
        logger.warning("No API key provided for key-based API. Defaulting to 'wikimedia' for realistic photo sourcing.")
        active_api_type = "wikimedia"
        
    main_workflow(
        csv_path=args.csv,
        db_path=args.db,
        output_dir=args.output,
        style_prompt_path=args.style_prompt,
        api_key=active_api_key,
        api_type=active_api_type,
        update_cms=args.update_cms,
        dry_run=args.dry_run
    )
