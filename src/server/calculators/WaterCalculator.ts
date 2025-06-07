import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WaterCalculatorOptions {
  WaterPrice: number;
  SavagePrice: number;
  WaterSubscriptionFee: number;
  WaterConsumptionFactor: number;
  SavageSubscriptionFee: number;
  SavageConsumptionFactor: number;
  TaxRate: number;
}

interface Usage {
  netPrice: number;
  grossPrice: number;
  consumption: number;
  details: {
    waterSubscriptionFee: number;
    savageSubscriptionFee: number;
    waterConsumptionFee: number;
    savageConsumptionFee: number;
  };
}

interface ConsumptionData {
  date: string;
  gas: string;
  power: string;
  water: string;
}

class WaterCalculator {
  private options: WaterCalculatorOptions;

  constructor() {
    const configPath = path.join(__dirname, '../config/appsettings.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.options = config.WaterCalculatorOptions;
  }

  calculate(previousMetric: ConsumptionData, currentMetric: ConsumptionData): Usage {
    const consumption = Number(currentMetric.water) - Number(previousMetric.water);
    
    // Calculate subscription fees with tax
    const waterSubscriptionFee = Number((
      this.options.WaterSubscriptionFee * 
      this.options.WaterConsumptionFactor * 
      this.options.TaxRate
    ).toFixed(2));

    const savageSubscriptionFee = Number((
      this.options.SavageSubscriptionFee * 
      this.options.SavageConsumptionFactor * 
      this.options.TaxRate
    ).toFixed(2));

    // Calculate consumption fees with tax
    const waterConsumptionFee = Number((
      consumption * 
      (this.options.WaterPrice + (this.options.WaterPrice * (this.options.TaxRate - 1)))
    ).toFixed(2));

    const savageConsumptionFee = Number((
      consumption * 
      (this.options.SavagePrice + (this.options.SavagePrice * (this.options.TaxRate - 1)))
    ).toFixed(2));

    // Calculate total gross price
    const grossPrice = Number((
      waterSubscriptionFee + 
      savageSubscriptionFee + 
      waterConsumptionFee + 
      savageConsumptionFee
    ).toFixed(2));

    return {
      netPrice: 0, // As per C# implementation
      grossPrice,
      consumption,
      details: {
        waterSubscriptionFee,
        savageSubscriptionFee,
        waterConsumptionFee,
        savageConsumptionFee
      }
    };
  }

  calculateForDataset(data: ConsumptionData[]): (Usage & { date: string })[] {
    if (data.length < 2) {
      return [];
    }

    // Sort data by date
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const results: (Usage & { date: string })[] = [];

    // Calculate for each pair of consecutive readings
    for (let i = 1; i < sortedData.length; i++) {
      const previousReading = sortedData[i - 1];
      const currentReading = sortedData[i];

      const usage = this.calculate(previousReading, currentReading);
      
      results.push({
        ...usage,
        date: currentReading.date
      });
    }

    return results;
  }
}

export default WaterCalculator; 