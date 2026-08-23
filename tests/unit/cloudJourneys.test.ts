import assert from 'node:assert/strict';
import test from 'node:test';
import { cloudJourneys, journeyStopByPath } from '../../src/data/cloudJourneys.ts';

test('云游路线拥有唯一标识、完整站点和可复用足迹索引', () => {
  assert.equal(cloudJourneys.length, 3);
  assert.equal(new Set(cloudJourneys.map(({ id }) => id)).size, cloudJourneys.length);

  const stops = cloudJourneys.flatMap(({ stops }) => stops);
  assert.ok(cloudJourneys.every(({ stops: journeyStops }) => journeyStops.length >= 4));
  assert.equal(new Set(stops.map(({ path }) => path)).size, stops.length);
  assert.equal(journeyStopByPath.size, stops.length);
  assert.ok(stops.every(({ path, label, reason }) => path.startsWith('/') && label.length > 1 && reason.length > 5));
});
