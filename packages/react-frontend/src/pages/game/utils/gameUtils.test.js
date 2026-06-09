/* eslint-disable no-redeclare */
/* global expect, test */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getConfiguredRoundSeconds(room) {
  return room?.options?.roundSeconds ?? room?.roundSeconds ?? 120;
}

function getRoomTimeLeft(room, now) {
  const roundSeconds = getConfiguredRoundSeconds(room);

  if (room?.timerPaused) {
    return clamp(room.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
  }

  if (now == null) {
    return clamp(room?.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
  }

  if (room?.roundEndsAt) {
    return clamp(Math.ceil((new Date(room.roundEndsAt).getTime() - now) / 1000), 0, roundSeconds);
  }

  return clamp(room?.timerRemainingSeconds ?? roundSeconds, 0, roundSeconds);
}

test("configured room timer prefers options over a stale room field", () => {
  const room = {
    roundSeconds: 120,
    options: { roundSeconds: 45 },
    roundEndsAt: new Date(100000).toISOString(),
    timerPaused: false,
    timerRemainingSeconds: 120,
  };

  expect(getConfiguredRoundSeconds(room)).toBe(45);
  expect(getRoomTimeLeft(room, 50000)).toBe(45);
});

test("running room timer uses the configured end time", () => {
  const room = {
    options: { roundSeconds: 90 },
    roundEndsAt: new Date(65000).toISOString(),
    timerPaused: false,
  };

  expect(getRoomTimeLeft(room, 50000)).toBe(15);
});

test("paused room timer clamps remaining time to configured round seconds", () => {
  const room = {
    options: { roundSeconds: 30 },
    timerPaused: true,
    timerRemainingSeconds: 60,
  };

  expect(getRoomTimeLeft(room, 50000)).toBe(30);
});
