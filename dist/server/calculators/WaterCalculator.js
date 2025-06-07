import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
class WaterCalculator {
    constructor() {
        const configPath = path.join(__dirname, '../config/appsettings.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.options = config.WaterCalculatorOptions;
    }
    calculate(previousMetric, currentMetric) {
        const consumption = Number(currentMetric.water) - Number(previousMetric.water);
        // Calculate subscription fees with tax
        const waterSubscriptionFee = Number((this.options.WaterSubscriptionFee *
            this.options.WaterConsumptionFactor *
            this.options.TaxRate).toFixed(2));
        const savageSubscriptionFee = Number((this.options.SavageSubscriptionFee *
            this.options.SavageConsumptionFactor *
            this.options.TaxRate).toFixed(2));
        // Calculate consumption fees with tax
        const waterConsumptionFee = Number((consumption *
            (this.options.WaterPrice + (this.options.WaterPrice * (this.options.TaxRate - 1)))).toFixed(2));
        const savageConsumptionFee = Number((consumption *
            (this.options.SavagePrice + (this.options.SavagePrice * (this.options.TaxRate - 1)))).toFixed(2));
        // Calculate total gross price
        const grossPrice = Number((waterSubscriptionFee +
            savageSubscriptionFee +
            waterConsumptionFee +
            savageConsumptionFee).toFixed(2));
        return {
            netPrice: 0,
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
