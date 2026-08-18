# Scrap Mechanic Save Editor - Lootbag Recovery

A web-based save editor for Scrap Mechanic Survival to help players recover their lost items, especially lootbags that fell through the map or became inaccessible.

This tool runs entirely in your browser using WebAssembly (`sql.js`). **No data is uploaded to any server**, ensuring your save files remain completely private and secure on your machine.

## How to use

1. Find your save file on Windows:
   - Press `Win + R` and type `%appdata%\Axolot Games\Scrap Mechanic\User`.
   - Open the `User_XXXXX` folder, then go to `Save` -> `Survival`.
   - Look for the `.db` file corresponding to your save (e.g. `MyAmazingWorld.db`).
2. Make a copy of your save file before making any changes!
3. Drag and drop the save file into the web tool.
4. Perform the item transfers you want.
5. Download the modified save file and replace your original save file.
6. Launch Scrap Mechanic and enjoy your recovered items!

## Development

This project was built with React, TypeScript, and Vite.

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Technical Details

The tool reverse-engineers the Scrap Mechanic SQLite save format:
- Items are stored as binary blobs in the `Container` table.
- Positions are stored as Big-Endian floats in the `RigidBody` and `RigidBodyBounds` tables.
- Inventory slots are 22 bytes (16 bytes UUID, 4 bytes Slot ID, 2 bytes Quantity).

## Disclaimer

This tool is not affiliated with or endorsed by Axolot Games. Always backup your save files before modifying them.
