'use strict';

const Inverter = require('../../inverter');
const { EnphaseEnvoyApi } = require('./api');

class EnphaseEnvoy extends Inverter {
    onDiscoveryResult(discoveryResult) {
        // Return a truthy value here if the discovery result matches your device.
        return discoveryResult.id === this.getData().id;
    }
      
    async onDiscoveryAvailable(discoveryResult) {
        this.log('Discovery available');

        // This method will be executed once when the device has been found (onDiscoveryResult returned true)
        this.enphaseApi = new EnphaseEnvoyApi(`${discoveryResult.address}:${discoveryResult.port}`);

        await this.enphaseApi.getProductionData(); // When this throws, the device will become unavailable.
    }
      
    onDiscoveryAddressChanged(discoveryResult) {
        // Update your connection details here, reconnect when the device is offline
        this.enphaseApi = new EnphaseEnvoyApi(`${discoveryResult.address}:${discoveryResult.port}`);
    }
      
    onDiscoveryLastSeenChanged(_) {
        // When the device is offline, try to reconnect here
        this.setAvailable();
    }

    getCronString() {
        return '*/5 * * * * *';
    }

    async checkProduction() {
        this.log('Checking production');

        if (this.enphaseApi) {
            try {
                const productionData = await this.enphaseApi.getProductionData();
    
                const currentEnergy = productionData.production[1].activeCount > 0 ? Math.round(productionData.production[1].whToday / 1000) : null;
                const currentPower = productionData.production[1].activeCount > 0 ? productionData.production[1].wNow : productionData.production[0].wNow;
    
                if (currentEnergy !== null) {
                    this.setCapabilityValue('meter_power', currentEnergy);
                    this.log(`Current production energy is ${currentEnergy}kWh`);
                }

                this.setCapabilityValue('measure_power', currentPower);    
                this.log(`Current production power is ${currentPower}W`);
    
                if (productionData.consumption[0].activeCount > 0) {
                    const currentConsumptionPower = productionData.consumption[0].wNow;
                    const currentConsumptionEnergy = Math.round(productionData.consumption[0].whToday / 1000)

                    this.setCapabilityValue('consumption', currentConsumptionPower);
                    this.setCapabilityValue('daily_consumption', currentConsumptionEnergy);

                    this.log(`Current consumption power is ${currentConsumptionPower}W`);
                    this.log(`Current consumption energy is ${currentConsumptionEnergy}W`);
                }

                if (!this.getAvailable()) {
                    await this.setAvailable();
                }
    
            } catch (error) {
                this.log(`Unavailable (${error})`);
                this.setUnavailable(`Error retrieving data (${error})`);
            }    
        } else {
            // TODO: remove
            this.log('Tried fetching production before API init or device unavailable!')
        }
    }
}

module.exports = EnphaseEnvoy;