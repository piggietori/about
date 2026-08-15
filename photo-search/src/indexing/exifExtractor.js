const exifr = require('exifr');

async function extractExif(filePath) {
  try {
    const data = await exifr.parse(filePath, {
      pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude'],
      gps: true,
    });

    if (!data) return { takenAt: null, gpsLat: null, gpsLon: null };

    let takenAt = null;
    const rawDate = data.DateTimeOriginal || data.CreateDate;
    if (rawDate instanceof Date && !isNaN(rawDate)) {
      takenAt = rawDate.toISOString();
    }

    const gpsLat = typeof data.latitude === 'number' ? data.latitude : null;
    const gpsLon = typeof data.longitude === 'number' ? data.longitude : null;

    return { takenAt, gpsLat, gpsLon };
  } catch {
    return { takenAt: null, gpsLat: null, gpsLon: null };
  }
}

module.exports = { extractExif };
