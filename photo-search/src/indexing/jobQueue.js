async function runWithConcurrency(items, fn, concurrency = 3) {
  const results = [];
  const queue = [...items];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      results.push(await fn(item).catch(err => ({ error: err, item })));
    }
  });
  await Promise.all(workers);
  return results;
}

module.exports = { runWithConcurrency };
