const { EventEmitter } = require('events');
const repo = require('../db/photoRepository');
const { scan } = require('./scanner');
const { extractExif } = require('./exifExtractor');
const { reverseGeocode } = require('./geocoder');
const { toBase64ForClaude, generateThumbnail } = require('./imagePreprocessor');
const { analyzeImage } = require('./visionAnalyzer');
const { runWithConcurrency } = require('./jobQueue');
const { getSetting } = require('../db/photoRepository');
const logger = require('../lib/logger');

const emitter = new EventEmitter();
let state = { running: false, total: 0, processed: 0, errors: 0, currentFile: null };

function getState() { return { ...state }; }
function on(event, fn) { emitter.on(event, fn); }

async function processOne({ id, filePath }) {
  state.currentFile = filePath;
  emitter.emit('progress', getState());

  repo.markProcessing(id);

  const exif = await extractExif(filePath);
  repo.updateExif(id, exif);

  if (exif.gpsLat != null) {
    const place = await reverseGeocode(exif.gpsLat, exif.gpsLon);
    if (place) repo.updatePlaceName(id, place);
  }

  const base64 = await toBase64ForClaude(filePath);
  const analysis = await analyzeImage(base64);
  repo.markDone(id, analysis);

  await generateThumbnail(filePath, id).catch(() => {});

  state.processed++;
  emitter.emit('progress', getState());
}

async function start(photoDir) {
  if (state.running) {
    logger.warn('Indexing already running');
    return;
  }

  const dir = photoDir || getSetting('photo_dir');
  if (!dir) throw new Error('No photo directory configured');

  state = { running: true, total: 0, processed: 0, errors: 0, currentFile: null };
  emitter.emit('start', getState());

  try {
    const pending = scan(dir);
    state.total = pending.length;
    emitter.emit('progress', getState());

    if (!pending.length) {
      logger.info('Nothing to process');
      return;
    }

    await runWithConcurrency(pending, async (item) => {
      try {
        await processOne(item);
      } catch (err) {
        logger.error(`Failed ${item.filePath}: ${err.message}`);
        repo.markError(item.id, err.message);
        state.errors++;
        emitter.emit('progress', getState());
      }
    }, 2);
  } finally {
    state.running = false;
    state.currentFile = null;
    emitter.emit('done', getState());
    logger.info(`Indexing done. Processed: ${state.processed}, Errors: ${state.errors}`);
  }
}

module.exports = { start, getState, on };
