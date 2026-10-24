import { haversine, distanceToPolyline } from "./geo.js";

// Turn-by-turn brain. Pure function: give it the GPS position, it says what to do next.
// Nothing here touches the screen, so it can be tested with node.

export const ARRIVE_M = 25; // closer than this to the destination = arrived
export const ADVANCE_M = 20; // closer than this to a turn point = turn is done
export const ANNOUNCE_M = 60; // tell the user about the next turn at this distance
export const OFF_ROUTE_M = 45; // farther than this from the route line = off route
export const WALK_SPEED = 1.3; // metres per second

export function startState(route) {
  const steps = (route && route.steps) || [];
  return {
    stepIdx: steps.length > 1 ? 1 : 0, // step 0 is "start walking"
    announced: false,
    arrived: false,
    offCount: 0,
  };
}

function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function roundTo10(m) {
  return Math.max(10, Math.round(m / 10) * 10);
}

// st = state from startState / previous call, pos = {lat,lng,accuracy}, dest = {lat,lng,name}
export function navTick(st, pos, route, dest) {
  const events = [];
  const state = { ...st };
  const steps = (route && route.steps) || [];
  const dDest = haversine(pos, dest);
  const acc = Math.min(pos.accuracy || 0, 15);

  if (!state.arrived && dDest <= ARRIVE_M + acc) {
    state.arrived = true;
    events.push({ type: "arrive", text: `You have reached ${dest.name || "your destination"}` });
    return { state, events, distToStep: dDest, remaining: 0, offRoute: false, stepIdx: state.stepIdx };
  }
  if (state.arrived) {
    return { state, events, distToStep: dDest, remaining: 0, offRoute: false, stepIdx: state.stepIdx };
  }

  // move forward when we reach a turn point (never past the last "arrive" step)
  let idx = state.stepIdx;
  while (idx < steps.length - 1 && haversine(pos, steps[idx]) <= ADVANCE_M) {
    idx++;
    state.announced = false;
  }
  state.stepIdx = idx;

  const step = steps[idx];
  const distToStep = step ? haversine(pos, step) : dDest;

  if (step && !state.announced && step.type !== "arrive" && distToStep <= ANNOUNCE_M) {
    state.announced = true;
    events.push({
      type: "announce",
      text: `In ${roundTo10(distToStep)} metres, ${lowerFirst(step.text)}`,
    });
  }

  // distance left along the route
  let remaining = distToStep;
  for (let j = idx; j < steps.length; j++) remaining += steps[j].distance || 0;
  if (!steps.length) remaining = dDest;

  // off route check (only when we have a real walking route)
  let offRoute = false;
  if (route && !route.approximate && route.geometry && route.geometry.length > 1) {
    const dLine = distanceToPolyline(pos, route.geometry);
    const limit = Math.max(OFF_ROUTE_M, (pos.accuracy || 0) * 1.5);
    state.offCount = dLine > limit ? state.offCount + 1 : 0;
    if (state.offCount >= 3) {
      offRoute = true;
      state.offCount = 0;
    }
  }

  return { state, events, distToStep, remaining, offRoute, stepIdx: idx };
}
