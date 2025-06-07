import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
class GasCalculator {
    constructor() {
        const configPath = path.join(__dirname, '../config/appsettings.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.options = config.GasCalculatorOptions;
    }
    calculate(previousMetric, currentMetric, billingUnitsCount) {
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
    calculateForDataset(data) {
        if (data.length < 2) {
            return [];
        }
        // Sort data by date
        const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const results = [];
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
