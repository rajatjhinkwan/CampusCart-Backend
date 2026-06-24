// Haversine formula to calculate distance between two points on Earth
function haversineDistance([lat1, lng1], [lat2, lng2]) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Estimate ETA based on distance and average speed (default 30 km/h)
function estimateETAmins(distanceKm, avgSpeedKmph = 30) {
  if (distanceKm <= 0 || avgSpeedKmph <= 0) return 0;
  return Math.round((distanceKm / avgSpeedKmph) * 60); // ETA in minutes
}

module.exports = {
  haversineDistance,
  estimateETAmins
};
