// Lightweight monitoring helper — replace with real metrics exporter in production
const metrics = {
  counters: {},
};

function increment(metricName, value = 1) {
  metrics.counters[metricName] = (metrics.counters[metricName] || 0) + value;
}

function getMetrics() {
  return { ...metrics };
}

module.exports = { increment, getMetrics };
