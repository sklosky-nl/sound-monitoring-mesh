/**
 * Charts and visualization functionality
 */

// Chart instances
const Charts = {
    historyChart: null,
    analyticsChart: null
};

// Initialize history chart
function initHistoryChart() {
    const ctx = document.getElementById('historyChart');
    if (!ctx) return;

    if (Charts.historyChart) {
        Charts.historyChart.destroy();
    }

    Charts.historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Overall Sound Level (dB)',
                data: [],
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.1,
                fill: true,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'dB Level'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            }
        }
    });
}

// Update history chart with data
function updateHistoryChart(measurements, bandConfig = []) {
    if (!Charts.historyChart) {
        initHistoryChart();
    }

    const labels = measurements.map(m => new Date(m.timestamp).toLocaleString());
    const overallData = measurements.map(m => m.db_level);

    // Prepare datasets
    const datasets = [{
        label: 'Overall Sound Level',
        data: overallData,
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.1,
        fill: true,
        borderWidth: 3
    }];

    // Add frequency band datasets if available
    // Find first measurement with frequency bands data
    const firstWithBands = measurements.find(m => m.frequency_bands && m.frequency_bands.length > 0);
    
    if (firstWithBands) {
        console.log('Processing frequency bands:', firstWithBands.frequency_bands);
        
        const bandColors = [
            { border: 'rgb(16, 185, 129)', bg: 'rgba(16, 185, 129, 0.1)' },
            { border: 'rgb(251, 146, 60)', bg: 'rgba(251, 146, 60, 0.1)' },
            { border: 'rgb(236, 72, 153)', bg: 'rgba(236, 72, 153, 0.1)' },
            { border: 'rgb(168, 85, 247)', bg: 'rgba(168, 85, 247, 0.1)' },
            { border: 'rgb(234, 179, 8)', bg: 'rgba(234, 179, 8, 0.1)' }
        ];

        const bandsCount = firstWithBands.frequency_bands.length;
        console.log('Bands count:', bandsCount);
        
        for (let i = 0; i < bandsCount; i++) {
            const bandNumber = i + 1;
            const bandData = measurements.map(m => {
                const band = m.frequency_bands?.find(b => b.band_number === bandNumber);
                return band ? band.level : null;
            });

            // Try to get frequency range from data or config
            const firstBand = firstWithBands.frequency_bands.find(b => b.band_number === bandNumber);
            let freqRange = '';
            if (firstBand && firstBand.start_freq && firstBand.end_freq) {
                freqRange = ` (${firstBand.start_freq}-${firstBand.end_freq}Hz)`;
            } else {
                const config = bandConfig.find(b => b.band_number === bandNumber);
                freqRange = config ? ` (${config.start_frequency}-${config.end_frequency}Hz)` : '';
            }
            
            const color = bandColors[i % bandColors.length];

            console.log(`Adding Band ${bandNumber}${freqRange} with ${bandData.filter(d => d !== null).length} data points`);

            datasets.push({
                label: `Band ${bandNumber}${freqRange}`,
                data: bandData,
                borderColor: color.border,
                backgroundColor: color.bg,
                tension: 0.1,
                fill: false,
                borderWidth: 2
            });
        }
    } else {
        console.log('No frequency bands found in measurements');
    }

    console.log('Total datasets:', datasets.length);
    Charts.historyChart.data.labels = labels;
    Charts.historyChart.data.datasets = datasets;
    Charts.historyChart.update();
}

// Initialize analytics chart
function initAnalyticsChart() {
    const ctx = document.getElementById('analyticsChart');
    if (!ctx) return;

    if (Charts.analyticsChart) {
        Charts.analyticsChart.destroy();
    }

    Charts.analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Min', '25th %ile', 'Median', 'Mean', '75th %ile', '95th %ile', 'Max'],
            datasets: [{
                label: 'Sound Levels (dB)',
                data: [],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(99, 102, 241, 0.6)',
                    'rgba(168, 85, 247, 0.6)',
                    'rgba(236, 72, 153, 0.6)',
                    'rgba(251, 146, 60, 0.6)',
                    'rgba(239, 68, 68, 0.6)'
                ],
                borderColor: [
                    'rgb(16, 185, 129)',
                    'rgb(59, 130, 246)',
                    'rgb(99, 102, 241)',
                    'rgb(168, 85, 247)',
                    'rgb(236, 72, 153)',
                    'rgb(251, 146, 60)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'dB Level'
                    }
                }
            }
        }
    });
}

// Update analytics chart with stats
function updateAnalyticsChart(stats) {
    if (!Charts.analyticsChart) {
        initAnalyticsChart();
    }

    const data = [
        stats.min,
        stats.percentile_25,
        stats.median,
        stats.mean,
        stats.percentile_75,
        stats.percentile_95,
        stats.max
    ];

    Charts.analyticsChart.data.datasets[0].data = data;
    Charts.analyticsChart.update();
}

// Clean up charts on tab change
function cleanupCharts() {
    if (Charts.historyChart) {
        Charts.historyChart.destroy();
        Charts.historyChart = null;
    }
    if (Charts.analyticsChart) {
        Charts.analyticsChart.destroy();
        Charts.analyticsChart = null;
    }
}
