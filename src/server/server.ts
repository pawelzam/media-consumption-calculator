import { Application, Request, Response } from 'express';
import express from 'express';
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

// Serve static files from the React build
app.use(express.static(path.join(__dirname, '../../build')));

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

// GET all consumption entries for an apartment
app.get('/api/consumption/:apartment', (req, res) => {
  try {
    const { apartment } = req.params;
    const data = readData(apartment);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: 'Invalid apartment' });
  }
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

// POST new consumption entry
app.post('/api/consumption/:apartment', (req, res) => {
  try {
    const { apartment } = req.params;
    const { date, power, gas, water, gasPercentage, powerReduction } = req.body;
    
    // Validate required fields
    if (!date || !power || !gas || !water) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newEntry = {
      guid: uuidv4(),
      date,
      power,
      gas,
      water,
      gasPercentage: gasPercentage || '50',
      powerReduction: powerReduction || 0
    };

    const data = readData(apartment);
    data.push(newEntry);
    
    if (writeData(apartment, data)) {
      res.status(201).json(newEntry);
    } else {
      res.status(500).json({ error: 'Failed to save data' });
    }
  } catch (error) {
    console.error('Error in POST /api/consumption:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update consumption entry
app.put('/api/consumption/:apartment/:guid', (req, res) => {
  try {
    const { apartment, guid } = req.params;
    const { date, power, gas, water, gasPercentage, powerReduction } = req.body;

    // Validate required fields
    if (!date || !power || !gas || !water) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate gas percentage if provided
    if (gasPercentage !== undefined) {
      const percentage = Number(gasPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        return res.status(400).json({ error: 'Gas percentage must be between 0 and 100' });
      }
    }

    const data = readData(apartment);
    const index = data.findIndex((entry: any) => entry.guid === guid);

    if (index === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    data[index] = {
      guid,
      date,
      power,
      gas,
      water,
      gasPercentage: gasPercentage || '50',
      powerReduction: powerReduction || 0
    };

    if (writeData(apartment, data)) {
      res.json(data[index]);
    } else {
      res.status(500).json({ error: 'Failed to update data' });
    }
  } catch (error) {
    console.error('Error in PUT /api/consumption/:apartment/:guid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE consumption entry
app.delete('/api/consumption/:apartment/:guid', (req, res) => {
  try {
    const { apartment, guid } = req.params;
    const data = readData(apartment);
    const filteredData = data.filter((entry: any) => entry.guid !== guid);

    if (data.length === filteredData.length) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (writeData(apartment, filteredData)) {
      res.json({ message: 'Entry deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete entry' });
    }
  } catch (error) {
    console.error('Error in DELETE /api/consumption/:apartment/:guid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve React app for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Available apartments:', getAvailableApartments());
}); 