# Photo Memory Search

Search your iPhone photo library using natural-language queries like **"family vacation"**, **"school events"**, or **"birthday parties"**. The app analyzes your photos with Claude AI and lets you search by topic, scene, people, place, and more — with a natural-language summary of what it finds.

## How it works

1. Export your iPhone photos to a local folder on your computer
2. The app scans the folder, extracts GPS/date metadata, and asks Claude Vision to describe each photo (scene, activities, categories, people)
3. Everything is stored in a local SQLite database — nothing is sent anywhere except your photos to the Anthropic API for analysis
4. You search with natural-language queries; Claude interprets your intent and matches photos from the index, then summarizes the results

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com) (you'll need a paid account; indexing a 1,000-photo library costs roughly $8)

## Getting your iPhone photos onto your computer

### macOS — Image Capture (simplest)

1. Connect iPhone via USB cable
2. Unlock your iPhone and tap **"Trust This Computer"** if prompted
3. Open **Image Capture** (Cmd+Space → "Image Capture")
4. Select your iPhone in the left sidebar
5. At the bottom, set **"Import To"** to a folder (e.g. `~/Pictures/iPhone`)
6. Click **"Import All"**

> **HEIC photos**: Image Capture exports in the original format. If you'd prefer JPEG, open the Photos app → Preferences → check "Automatic" under Camera Capture. Or use the `--output-format jpeg` option in Image Capture's settings menu.

### Windows — File Explorer

1. Connect iPhone via USB
2. Unlock your iPhone and tap **"Trust This Computer"**
3. Open **File Explorer** → your iPhone appears under **"This PC"**
4. Navigate to **Internal Storage → DCIM** → copy the folders to a local path (e.g. `C:\Users\You\Pictures\iPhone`)

Alternatively, use the **Windows Photos** app: Import → From a USB device → select your iPhone.

### Linux — ifuse + libimobiledevice

```bash
sudo apt install libimobiledevice-utils ifuse   # Debian/Ubuntu
idevicepair pair
mkdir ~/iphone-mount
ifuse ~/iphone-mount
cp -r ~/iphone-mount/DCIM ~/Pictures/iPhone
fusermount -u ~/iphone-mount
```

## Install & run

```bash
git clone https://github.com/piggietori/photo-memory-search
cd photo-memory-search
npm install

# Configure
cp .env.example .env
# Edit .env and set:
#   ANTHROPIC_API_KEY=sk-ant-...
#   PHOTO_DIR=/path/to/your/iphone/photos   (optional — you can also set this in the UI)

npm start
# Open http://localhost:3000
```

## First-time use

1. Open [http://localhost:3000/setup](http://localhost:3000/setup)
2. Enter the path to your iPhone photo folder and save
3. Go to [Indexing](http://localhost:3000/indexing.html) → click **"Start Indexing"**
   - Only new or changed photos are processed on subsequent runs
   - A progress bar shows current file and count
4. Once indexing completes, go to [Search](http://localhost:3000) and try queries like:
   - `family vacation`
   - `school events`
   - `birthday party`
   - `beach in summer`
   - `photos with grandma`

## Cost estimate

| Library size | Estimated cost |
|---|---|
| 500 photos | ~$4 |
| 1,000 photos | ~$8 |
| 5,000 photos | ~$40 |

Subsequent indexing runs only process new/changed photos — much cheaper. You can pause and resume at any time; completed photos are saved and won't be re-analyzed.

## Privacy

- Your photos are sent to Anthropic's API for visual analysis (subject to [Anthropic's privacy policy](https://www.anthropic.com/privacy))
- No photos or metadata are sent to any other service
- The photo index (descriptions, tags, places) is stored locally in `data/photos.db`
- Thumbnails are cached locally in `data/thumbnails/`

## Running tests

```bash
node test/fixtures/generate-fixtures.js   # create small test images (once)
npm test
```

## License

MIT
