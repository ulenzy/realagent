import { mockProperties } from './src/data/mockListings.ts';
import fs from 'fs';
fs.writeFileSync('output.json', JSON.stringify({ image1: mockProperties[0].image, image2: mockProperties[1].image }));
