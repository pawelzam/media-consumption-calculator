import fs from 'fs';
import path from 'path';

interface GasCalculatorOptions {
  ConversionFactor: number;
  NetPricePerKWh: number;
  SubscriptionFee: number;
  FixedDistributionFee: number;
  VariableDistributionFee: number;
  TaxRate: number;
}

interface Usage {
  netPrice: number;
  grossPrice: number;
  consumptionInKWh: number;
  consumption: number;
}

interface ConsumptionData {
  date: string;
  gas: string;
  power: string;
  water: string;
  gasPercentage?: string;
}

class GasCalculator {
  private options: GasCalculatorOptions;

  constructor() {
    const configPath = path.join(__dirname, '../config/appsettings.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.options = config.GasCalculatorOptions;
  }

  calculate(previousMetric: ConsumptionData, currentMetric: ConsumptionData, billingUnitsCount: number): Usage {
    const consumption = Number(currentMetric.gas) - Number(previousMetric.gas);
    const gasPercentage = Number(currentMetric.gasPercentage || '100') / 100;
    const adjustedConsumption = consumption;
    
    const consumptionInKWh = Math.round(adjustedConsumption * this.options.ConversionFactor);
    const consumptionNet = consumptionInKWh * this.options.NetPricePerKWh;
    const subscriptionFee = this.options.SubscriptionFee * billingUnitsCount;
    const fixedDistributionFee = this.options.FixedDistributionFee * billingUnitsCount;
    const variableDistributionFee = consumptionInKWh * this.options.VariableDistributionFee;

    const netPrice = Number((consumptionNet + subscriptionFee + fixedDistributionFee + variableDistributionFee).toFixed(2));
    const grossPrice = Number((netPrice * this.options.TaxRate).toFixed(2)) * gasPercentage;

    return {
      netPrice,
      grossPrice,
      consumptionInKWh,
      consumption: adjustedConsumption
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

      // Calculate months between readings for billing units
      const previousDate = new Date(previousReading.date);
      const currentDate = new Date(currentReading.date);
      const monthsDiff = (currentDate.getFullYear() - previousDate.getFullYear()) * 12 + 
                        (currentDate.getMonth() - previousDate.getMonth());
      
      const billingUnits = Math.max(1, monthsDiff); // Minimum 1 month

      const usage = this.calculate(previousReading, currentReading, billingUnits);
      
      results.push({
        ...usage,
        date: currentReading.date
      });
    }

    return results;
  }
}

export default GasCalculator; 