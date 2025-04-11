document.addEventListener('DOMContentLoaded', function() {
    // E96 series resistor values (multiplier = 1)
    const E96 = [
        1.00, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40,
        1.43, 1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74, 1.78, 1.82, 1.87, 1.91, 1.96, 2.00,
        2.05, 2.10, 2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87,
        2.94, 3.01, 3.09, 3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12,
        4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49, 5.62, 5.76, 5.90,
        6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45,
        8.66, 8.87, 9.09, 9.31, 9.53, 9.76
    ];
    
    // Generate full E96 series with multipliers (1-100k) for primary resistors
    const fullE96Series = [];
    for (let i = 0; i <= 4; i++) {  // multipliers: 1, 10, 100, 1000, 10000
        const multiplier = Math.pow(10, i);
        E96.forEach(value => {
            const resistorValue = value * multiplier;
            if (resistorValue <= 100000) {
                fullE96Series.push(resistorValue);
            }
        });
    }
    
    // Extended E96 series with multipliers (1-1M) for parallel combinations
    const extendedE96Series = [];
    for (let i = 0; i <= 5; i++) {  // multipliers: 1, 10, 100, 1000, 10000, 100000
        const multiplier = Math.pow(10, i);
        E96.forEach(value => {
            const resistorValue = value * multiplier;
            if (resistorValue <= 1000000) {
                extendedE96Series.push(resistorValue);
            }
        });
    }
    
    // UI Elements
    const feedbackVoltageSelect = document.getElementById('feedbackVoltage');
    const targetVoltageInput = document.getElementById('targetVoltage');
    const r1Input = document.getElementById('r1');
    const r2Input = document.getElementById('r2');
    const findR1Button = document.getElementById('findR1');
    const findR2Button = document.getElementById('findR2');
    const findR1ParallelButton = document.getElementById('findR1Parallel');
    const findR2ParallelButton = document.getElementById('findR2Parallel');
    const r1NearestElement = document.getElementById('r1Nearest');
    const r2NearestElement = document.getElementById('r2Nearest');
    const calculateButton = document.getElementById('calculate');
    const actualVoltageElement = document.getElementById('actualVoltage');
    const voltageErrorElement = document.getElementById('voltageError');
    const currentTotalElement = document.getElementById('currentTotal');
    
    // Function to find nearest E96 resistor value from regular series (1-100k)
    function findNearestE96(value) {
        if (value < 1) return 1.00;
        if (value > 100000) return 100000;
        
        let closest = fullE96Series[0];
        let minDiff = Math.abs(value - closest);
        
        for (let i = 1; i < fullE96Series.length; i++) {
            const diff = Math.abs(value - fullE96Series[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = fullE96Series[i];
            }
        }
        
        return closest;
    }
    
    // Function to find nearest extended E96 resistor value (1-1M)
    function findNearestExtendedE96(value) {
        if (value < 1) return 1.00;
        if (value > 1000000) return 1000000;
        
        let closest = extendedE96Series[0];
        let minDiff = Math.abs(value - closest);
        
        for (let i = 1; i < extendedE96Series.length; i++) {
            const diff = Math.abs(value - extendedE96Series[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = extendedE96Series[i];
            }
        }
        
        return closest;
    }
    
    // Function to format resistor value
    function formatResistorValue(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 2) + 'MΩ';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(value % 1000 === 0 ? 0 : 2) + 'kΩ';
        } else {
            return value.toFixed(value % 1 === 0 ? 0 : 2) + 'Ω';
        }
    }
    
    // Function to calculate parallel resistance of two resistors
    function calculateParallelResistance(r1, r2) {
        return (r1 * r2) / (r1 + r2);
    }
    
    // Function to find best parallel resistor to achieve a target resistance
    function findBestParallelResistor(currentValue, targetValue) {
        // If the current value is already less than the target, we can't get closer with a parallel resistor
        if (currentValue < targetValue) {
            return null;
        }
        
        // Calculate the ideal parallel resistor value to hit the target exactly
        // (1/Rp) = (1/R1) + (1/R2) => R2 = (R1 * Rp) / (R1 - Rp)
        const idealParallel = (currentValue * targetValue) / (currentValue - targetValue);
        
        // If ideal parallel value is outside our range, return null
        if (idealParallel < 1 || idealParallel > 1000000) {
            return null;
        }
        
        // Find the closest extended E96 value (up to 1M)
        const closestE96 = findNearestExtendedE96(idealParallel);
        
        // Calculate the actual parallel resistance that would be achieved
        const actualParallel = calculateParallelResistance(currentValue, closestE96);
        
        return {
            parallelResistor: closestE96,
            combinedResistance: actualParallel
        };
    }
    
    // Function to calculate the required R1 value based on feedback voltage, target voltage, and R2
    function calculateR1(vFeedback, vTarget, r2) {
        return r2 * ((vTarget / vFeedback) - 1);
    }
    
    // Function to calculate the required R2 value based on feedback voltage, target voltage, and R1
    function calculateR2(vFeedback, vTarget, r1) {
        return r1 / ((vTarget / vFeedback) - 1);
    }
    
    // Function to calculate the actual output voltage
    function calculateActualVoltage(vFeedback, r1, r2) {
        return vFeedback * (1 + (r1 / r2));
    }
    
    // Function to calculate current through resistors in mA
    function calculateCurrents(outputVoltage, r1, r2) {
        // In a voltage divider, the resistors are in series
        // The current is calculated using the total resistance and output voltage
        const feedbackVoltage = outputVoltage / (1 + (r1 / r2));
        
        // Calculate current in mA through the divider
        // I = Vfb / R2 = Vout / (R1 + R2)
        const current = (feedbackVoltage / r2) * 1000;
        
        return {
            r1: current,  // Same current flows through R1
            r2: current,  // Same current flows through R2
            total: current // Total current is the same as individual currents (series circuit)
        };
    }
    
    // Event handler for the Calculate button
    calculateButton.addEventListener('click', function() {
        const feedbackVoltage = parseFloat(feedbackVoltageSelect.value);
        const r1 = parseFloat(r1Input.value);
        const r2 = parseFloat(r2Input.value);
        
        const actualVoltage = calculateActualVoltage(feedbackVoltage, r1, r2);
        const targetVoltage = parseFloat(targetVoltageInput.value);
        const error = ((actualVoltage - targetVoltage) / targetVoltage) * 100;
        
        // Calculate currents
        const currents = calculateCurrents(actualVoltage, r1, r2);
        
        // Update UI
        actualVoltageElement.textContent = actualVoltage.toFixed(3) + 'V';
        voltageErrorElement.textContent = error.toFixed(2) + '%';
        currentTotalElement.textContent = currents.total.toFixed(3) + 'mA';
    });
    
    // Event handler for the Find Best Match R1 button
    findR1Button.addEventListener('click', function() {
        const feedbackVoltage = parseFloat(feedbackVoltageSelect.value);
        const targetVoltage = parseFloat(targetVoltageInput.value);
        const r2 = parseFloat(r2Input.value);
        
        const idealR1 = calculateR1(feedbackVoltage, targetVoltage, r2);
        const nearestR1 = findNearestE96(idealR1);
        
        r1Input.value = nearestR1;
        r1NearestElement.textContent = formatResistorValue(nearestR1);
        
        // Recalculate and update the actual voltage and error
        const actualVoltage = calculateActualVoltage(feedbackVoltage, nearestR1, r2);
        const error = ((actualVoltage - targetVoltage) / targetVoltage) * 100;
        
        // Calculate currents
        const currents = calculateCurrents(actualVoltage, nearestR1, r2);
        
        // Update UI
        actualVoltageElement.textContent = actualVoltage.toFixed(3) + 'V';
        voltageErrorElement.textContent = error.toFixed(2) + '%';
        currentTotalElement.textContent = currents.total.toFixed(3) + 'mA';
    });
    
    // Event handler for the Find Best Match R2 button
    findR2Button.addEventListener('click', function() {
        const feedbackVoltage = parseFloat(feedbackVoltageSelect.value);
        const targetVoltage = parseFloat(targetVoltageInput.value);
        const r1 = parseFloat(r1Input.value);
        
        const idealR2 = calculateR2(feedbackVoltage, targetVoltage, r1);
        const nearestR2 = findNearestE96(idealR2);
        
        r2Input.value = nearestR2;
        r2NearestElement.textContent = formatResistorValue(nearestR2);
        
        // Recalculate and update the actual voltage and error
        const actualVoltage = calculateActualVoltage(feedbackVoltage, r1, nearestR2);
        const error = ((actualVoltage - targetVoltage) / targetVoltage) * 100;
        
        // Calculate currents
        const currents = calculateCurrents(actualVoltage, r1, nearestR2);
        
        // Update UI
        actualVoltageElement.textContent = actualVoltage.toFixed(3) + 'V';
        voltageErrorElement.textContent = error.toFixed(2) + '%';
        currentTotalElement.textContent = currents.total.toFixed(3) + 'mA';
    });
    
    // Event handler for the Find Parallel R1 button
    findR1ParallelButton.addEventListener('click', function() {
        const feedbackVoltage = parseFloat(feedbackVoltageSelect.value);
        const targetVoltage = parseFloat(targetVoltageInput.value);
        const r1 = parseFloat(r1Input.value);
        const r2 = parseFloat(r2Input.value);
        
        // Calculate the ideal R1 for the target voltage
        const idealR1 = calculateR1(feedbackVoltage, targetVoltage, r2);
        
        // Find the best parallel resistor
        const parallelResult = findBestParallelResistor(r1, idealR1);
        
        if (parallelResult) {
            // Update R1 input with the combined resistance
            r1Input.value = parallelResult.combinedResistance.toFixed(2);
            r1NearestElement.textContent = `${formatResistorValue(r1)} ∥ ${formatResistorValue(parallelResult.parallelResistor)} = ${formatResistorValue(parallelResult.combinedResistance)}`;
            
            // Recalculate and update the actual voltage and error
            const actualVoltage = calculateActualVoltage(feedbackVoltage, parallelResult.combinedResistance, r2);
            const error = ((actualVoltage - targetVoltage) / targetVoltage) * 100;
            
            // Calculate currents
            const currents = calculateCurrents(actualVoltage, parallelResult.combinedResistance, r2);
            
            // Update UI
            actualVoltageElement.textContent = actualVoltage.toFixed(3) + 'V';
            voltageErrorElement.textContent = error.toFixed(2) + '%';
            currentTotalElement.textContent = currents.total.toFixed(3) + 'mA';
        } else {
            r1NearestElement.textContent = "No suitable parallel resistor found";
        }
    });
    
    // Event handler for the Find Parallel R2 button
    findR2ParallelButton.addEventListener('click', function() {
        const feedbackVoltage = parseFloat(feedbackVoltageSelect.value);
        const targetVoltage = parseFloat(targetVoltageInput.value);
        const r1 = parseFloat(r1Input.value);
        const r2 = parseFloat(r2Input.value);
        
        // Calculate the ideal R2 for the target voltage
        const idealR2 = calculateR2(feedbackVoltage, targetVoltage, r1);
        
        // Find the best parallel resistor
        const parallelResult = findBestParallelResistor(r2, idealR2);
        
        if (parallelResult) {
            // Update R2 input with the combined resistance
            r2Input.value = parallelResult.combinedResistance.toFixed(2);
            r2NearestElement.textContent = `${formatResistorValue(r2)} ∥ ${formatResistorValue(parallelResult.parallelResistor)} = ${formatResistorValue(parallelResult.combinedResistance)}`;
            
            // Recalculate and update the actual voltage and error
            const actualVoltage = calculateActualVoltage(feedbackVoltage, r1, parallelResult.combinedResistance);
            const error = ((actualVoltage - targetVoltage) / targetVoltage) * 100;
            
            // Calculate currents
            const currents = calculateCurrents(actualVoltage, r1, parallelResult.combinedResistance);
            
            // Update UI
            actualVoltageElement.textContent = actualVoltage.toFixed(3) + 'V';
            voltageErrorElement.textContent = error.toFixed(2) + '%';
            currentTotalElement.textContent = currents.total.toFixed(3) + 'mA';
        } else {
            r2NearestElement.textContent = "No suitable parallel resistor found";
        }
    });
    
    // Initialize the UI with calculated values
    calculateButton.click();
});