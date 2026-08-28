import pandas as pd
import requests
from bs4 import BeautifulSoup
import re
import time
import os

# Complete list of 20 Man'yōshū volumes from Wikisource
base_url = "https://ja.wikisource.org/wiki/%E4%B8%87%E8%91%89%E9%9B%86/"
volumes = [
    "第一巻", "第二巻", "第三巻", "第四巻", "第五巻", "第六巻", "第七巻", "第八巻", "第九巻", "第十巻",
    "第十一巻", "第十二巻", "第十三巻", "第十四巻", "第十五巻", "第十六巻", "第十七巻", "第十八巻", "第十九巻", "第二十巻"
]
urls = [base_url + vol for vol in volumes]

# Target columns
columns = ['歌番号', '題詞', '原文', '訓読', '仮名', '左注', '校異', '事項', '訓異']

def scrape_volume(url):
    """Extract poems from one volume"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; Manyoshu-Scraper)'}
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        text = soup.get_text()

        # Capture blocks starting with [歌番号] and up to the next [歌番号] (so we keep the marker)
        blocks = re.findall(r'\[歌番号\].*?(?=(?:\[歌番号\])|\Z)', text, flags=re.S)
        poems = []

        for block in blocks:
            poem = {col: '' for col in columns}
            lines = block.strip().split('\n')

            current_key = None
            for line in lines:
                raw = line
                line = line.strip()
                if not line:
                    # keep blank lines as newlines for readability when appended
                    if current_key:
                        poem[current_key] += '\n'
                    continue

                if line.startswith('[') and ']' in line:
                    match = re.match(r'\[([^\]]+)\](.*)', raw)
                    if match:
                        key = match.group(1).strip()
                        value = match.group(2).strip()
                        if key in columns:
                            poem[key] = value
                            current_key = key
                        else:
                            # Unknown bracketed field; reset current key
                            current_key = None
                else:
                    # Non-bracket line: append to the last seen bracketed field (if any)
                    if current_key:
                        # preserve original spacing/newlines
                        if poem[current_key]:
                            poem[current_key] += '\n' + raw.strip()
                        else:
                            poem[current_key] = raw.strip()

            # If the block started with [歌番号], try to extract it also from the first line
            if not poem['歌番号']:
                first_line = lines[0].strip() if lines else ''
                m = re.match(r'\[歌番号\](.*)', first_line)
                if m:
                    poem['歌番号'] = m.group(1).strip()

            if poem['歌番号']:  # Valid poem
                poems.append(poem)

        print(f"Volume scraped: {len(poems)} poems")
        return poems

    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return []

# Scrape all volumes
all_poems = []
for i, url in enumerate(urls, 1):
    print(f"Scraping Volume {i}/20: {url}")
    poems = scrape_volume(url)
    all_poems.extend(poems)
    time.sleep(1)  # Polite delay

# Create DataFrame and save
df = pd.DataFrame(all_poems, columns=columns)
df = df[columns]  # Ensure column order

# Save UTF-8 CSV (Excel compatible)
output_file = 'manyoshu_complete_utf8.csv'
df.to_csv(output_file, index=False, encoding='utf-8-sig')
print(f"\n✅ Complete! {len(df)} poems saved to {output_file}")

# Verify first few rows
print("\nSample (first 3 poems):")
print(df.head(3).to_string())
