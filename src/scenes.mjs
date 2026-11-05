import { cluster } from './svg/cluster.mjs';
import { cache } from './svg/cache.mjs';
import { rollout } from './svg/rollout.mjs';
import { events } from './svg/events.mjs';
import { monitor } from './svg/monitor.mjs';
import { vision } from './svg/vision.mjs';

export { defs } from './svg/kit.mjs';
export const SCENES = { cluster, cache, rollout, events, vision, monitor };
