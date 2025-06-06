import fs from 'fs';
import path from 'path';

interface PowerCalculatorOptions {
  ActiveEnergy: number;
  RESFee: number;
  QualityComponent: number;
  NetworkFee: number;
  TransitionFee: number;
  FixedTransmissionFee: number;
  SubscriptionFee: number;
  CommercialFee: number;
  FixedCapacityFee: number;
  TaxRate: number;
}

interface Usage {
  netPrice: number;
  grossPrice: number;
  consumption: number;
  details: {
    activeEnergy: number;
    resFee: number;
    qualityComponent: number;
    networkFee: number;
    transitionFee: number;
    fixedTransmissionFee: number;
    subscriptionFee: number;
    commercialFee: number;
    fixedCapacityFee: number;
  };
}

interface ConsumptionData {
  date: string;
  gas: string;
  power: string;
  water: string;
}

class PowerCalculator {
  private options: PowerCalculatorOptions;

  constructor() {
    const configPath = path.join(__dirname, '../config/appsettings.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.options = config.PowerCalculatorOptions;
  }

  calculate(previousMetric: ConsumptionData, currentMetric: ConsumptionData, billingUnitsCount: number): Usage {
    const consumption = Number(currentMetric.power) - Number(previousMetric.power);
    
    const activeEnergy = Number((consumption * this.options.ActiveEnergy).toFixed(2));
    const resFee = Number((consumption * this.options.RESFee).toFixed(2));
    const qualityComponent = Number((consumption * this.options.QualityComponent).toFixed(2));
    const networkFee = Number((consumption * this.options.NetworkFee).toFixed(2));
    const transitionFee = Number((this.options.TransitionFee * billingUnitsCount).toFixed(2));
    const fixedTransmissionFee = Number((this.options.FixedTransmissionFee * billingUnitsCount).toFixed(2));
    const subscriptionFee = Number((this.options.SubscriptionFee * billingUnitsCount).toFixed(2));
    const commercialFee = Number((this.options.CommercialFee * billingUnitsCount).toFixed(2));
    const fixedCapacityFee = Number((this.options.FixedCapacityFee * billingUnitsCount).toFixed(2));

    const netPrice = Number((
      activeEnergy +
      resFee +
      qualityComponent +
      networkFee +
      transitionFee +
      fixedTransmissionFee +
      subscriptionFee +
      commercialFee +
      fixedCapacityFee
    ).toFixed(2));

    const grossPrice = Number((netPrice * this.options.TaxRate).toFixed(2));

    return {
      netPrice,
      grossPrice,
      consumption,
      details: {
        activeEnergy,
        resFee,
        qualityComponent,
        networkFee,
        transitionFee,
        fixedTransmissionFee,
        subscriptionFee,
        commercialFee,
        fixedCapacityFee
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

export default PowerCalculator; 