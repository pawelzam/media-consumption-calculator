import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import GasCalculator from './calculators/GasCalculator.js';
import PowerCalculator from './calculators/PowerCalculator.js';
import WaterCalculator from './calculators/WaterCalculator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Application = express();
const port = process.env.PORT || 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// Determine the build directory path
const buildPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../client/build')  // In production
  : path.join(__dirname, '../../build');     // In development

// Serve static files from the React build
app.use(express.static(buildPath));

// Initialize calculators
const gasCalculator = new GasCalculator();
const powerCalculator = new PowerCalculator();
const waterCalculator = new WaterCalculator();

// Data directory path
const dataDir = path.join(__dirname, 'data');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Function to get available apartments from data directory
const getAvailableApartments = (): string[] => {
  try {
    return fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  } catch (error) {
    console.error('Error reading data directory:', error);
    return [];
  }
};

// Get data file path for an apartment
const getDataFilePath = (apartment: string) => {
  const filePath = path.join(dataDir, `${apartment}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error('Invalid apartment');
  }
  return filePath;
};

// Read data from file
const readData = (apartment: string) => {
  try {
    const data = fs.readFileSync(getDataFilePath(apartment), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading data file for ${apartment}:`, error);
    return [];
  }
};

// Write data to file
const writeData = (apartment: string, data: any) => {
  try {
    const filePath = path.join(dataDir, `${apartment}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to data file for ${apartment}:`, error);
    return false;
  }
};

// GET available apartments
app.get('/api/apartments', (req, res) => {
  const apartments = getAvailableApartments();
  res.json(apartments);
});

// GET gas consumption calculations for an apartment
app.get('/api/consumption/:apartment/gas-calculations', (req, res) => {
  try {
    const { apartment } = req.params;
    const data = readData(apartment);
    
    if (!Array.isArray(data) || data.length < 2) {
      return res.status(400).json({ error: 'Insufficient data for calculations' });
    }

    const calculations = gasCalculator.calculateForDataset(data);
    res.json(calculations);
  } catch (error) {
    console.error('Error calculating gas consumption:', error);
    res.status(500).json({ error: 'Failed to calculate gas consumption' });
  }
});

// GET power consumption calculations for an apartment
app.get('/api/consumption/:apartment/power-calculations', (req, res) => {
  try {
    const { apartment } = req.params;
    const data = readData(apartment);
    
    if (!Array.isArray(data) || data.length < 2) {
      return res.status(400).json({ error: 'Insufficient data for calculations' });
    }

    const calculations = powerCalculator.calculateForDataset(data);
    res.json(calculations);
  } catch (error) {
    console.error('Error calculating power consumption:', error);
    res.status(500).json({ error: 'Failed to calculate power consumption' });
  }
});

// GET water consumption calculations for an apartment
app.get('/api/consumption/:apartment/water-calculations', (req, res) => {
  try {
    const { apartment } = req.params;
    const data = readData(apartment);
    
    if (!Array.isArray(data) || data.length < 2) {
      return res.status(400).json({ error: 'Insufficient data for calculations' });
    }

    const calculations = waterCalculator.calculateForDataset(data);
    res.json(calculations);
  } catch (error) {
    console.error('Error calculating water consumption:', error);
    res.status(500).json({ error: 'Failed to calculate water consumption' });
  }
});

// POST new reading for an apartment
app.post('/api/consumption/:apartment', (req, res) => {
  try {
    const { apartment } = req.params;
    const reading = req.body;
    
    // Add ID and timestamp if not provided
    const newReading = {
      id: reading.id || uuidv4(),
      timestamp: reading.timestamp || new Date().toISOString(),
      ...reading
    };

    // Get existing data
    let data = readData(apartment);
    if (!Array.isArray(data)) {
      data = [];
    }

    // Add new reading
    data.push(newReading);

    // Sort by timestamp
    data.sort((a: { timestamp: string }, b: { timestamp: string }) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Write back to file
    if (writeData(apartment, data)) {
      res.status(201).json(newReading);
    } else {
      res.status(500).json({ error: 'Failed to save reading' });
    }
  } catch (error) {
    console.error('Error saving consumption reading:', error);
    res.status(500).json({ error: 'Failed to save reading' });
  }
});

// DELETE reading from an apartment
app.delete('/api/consumption/:apartment/:readingId', (req, res) => {
  try {
    const { apartment, readingId } = req.params;
    
    // Get existing data
    let data = readData(apartment);
    if (!Array.isArray(data)) {
      return res.status(404).json({ error: 'No data found for apartment' });
    }

    // Find and remove reading
    const index = data.findIndex(reading => reading.id === readingId);
    if (index === -1) {
      return res.status(404).json({ error: 'Reading not found' });
    }

    data.splice(index, 1);

    // Write back to file
    if (writeData(apartment, data)) {
      res.status(200).json({ message: 'Reading deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete reading' });
    }
  } catch (error) {
    console.error('Error deleting consumption reading:', error);
    res.status(500).json({ error: 'Failed to delete reading' });
  }
});

// GET all readings for an apartment
app.get('/api/consumption/:apartment', (req, res) => {
  try {
    const { apartment } = req.params;
    const data = readData(apartment);
    res.json(data);
  } catch (error) {
    console.error('Error retrieving consumption readings:', error);
    res.status(500).json({ error: 'Failed to retrieve readings' });
  }
});

// Serve React app for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Available apartments:', getAvailableApartments());
}); 