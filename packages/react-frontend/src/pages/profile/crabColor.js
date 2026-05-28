export const DEFAULT_CRAB_PROFILE = Object.freeze({
  color: "#e74c3c",
  hat: "",
});

const CRAB_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MAX_CRAB_HAT_LENGTH = 80;
const LEGACY_CRAB_COLOR_KEY = "profileCrabColor";
const LEGACY_CRAB_HAT_KEY = "profileCrabHat";
const CRAB_ICON_MAX_SIZE = 220;
const IMAGE_CACHE = new Map();
const ICON_CACHE = new Map();
const ICON_CACHE_LIMIT = 80;

function getCrabStorageScope(userKey) {
  if (userKey) {
    return String(userKey);
  }

  if (typeof localStorage === "undefined") {
    return "guest";
  }

  return localStorage.getItem("userId") || localStorage.getItem("username") || "guest";
}

function getCrabStorageKey(field, userKey) {
  return `profileCrab:${encodeURIComponent(getCrabStorageScope(userKey))}:${field}`;
}

export function normalizeCrabProfile(crab = {}) {
  if (!crab || typeof crab !== "object" || Array.isArray(crab)) {
    return { ...DEFAULT_CRAB_PROFILE };
  }

  const color =
    typeof crab.color === "string" && CRAB_COLOR_PATTERN.test(crab.color)
      ? crab.color
      : DEFAULT_CRAB_PROFILE.color;
  const hat = typeof crab.hat === "string" ? crab.hat.trim().slice(0, MAX_CRAB_HAT_LENGTH) : "";

  return { color, hat };
}

export function readStoredCrabProfile(userKey) {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_CRAB_PROFILE };
  }

  return normalizeCrabProfile({
    color: localStorage.getItem(getCrabStorageKey("color", userKey)),
    hat: localStorage.getItem(getCrabStorageKey("hat", userKey)) || "",
  });
}

export function writeStoredCrabProfile(crab, userKey) {
  const normalizedCrab = normalizeCrabProfile(crab);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(getCrabStorageKey("color", userKey), normalizedCrab.color);

    if (normalizedCrab.hat) {
      localStorage.setItem(getCrabStorageKey("hat", userKey), normalizedCrab.hat);
    } else {
      localStorage.removeItem(getCrabStorageKey("hat", userKey));
    }

    localStorage.removeItem(LEGACY_CRAB_COLOR_KEY);
    localStorage.removeItem(LEGACY_CRAB_HAT_KEY);
  }

  return normalizedCrab;
}

export function clearStoredCrabProfile(userKey) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(getCrabStorageKey("color", userKey));
  localStorage.removeItem(getCrabStorageKey("hat", userKey));
  localStorage.removeItem(LEGACY_CRAB_COLOR_KEY);
  localStorage.removeItem(LEGACY_CRAB_HAT_KEY);
}

export function getHatSourceForCrab(crab, hatImages) {
  const normalizedCrab = normalizeCrabProfile(crab);

  return normalizedCrab.hat ? hatImages[`../../assets/hats/${normalizedCrab.hat}`] || "" : "";
}

function hexToRgb(hexColor) {
  const normalizedColor = normalizeCrabProfile({ color: hexColor }).color.replace("#", "");

  return {
    red: parseInt(normalizedColor.slice(0, 2), 16),
    green: parseInt(normalizedColor.slice(2, 4), 16),
    blue: parseInt(normalizedColor.slice(4, 6), 16),
  };
}

function isCrabBodyPixel(red, green, blue, alpha) {
  return alpha > 0 && red > 95 && red > green * 1.35 && red > blue * 1.35;
}

function loadImage(imageSource) {
  if (IMAGE_CACHE.has(imageSource)) {
    return IMAGE_CACHE.get(imageSource);
  }

  const imagePromise = new Promise((resolve) => {
    const image = new Image();

    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = imageSource;
  });

  IMAGE_CACHE.set(imageSource, imagePromise);
  return imagePromise;
}

function rememberIcon(cacheKey, iconSource) {
  ICON_CACHE.set(cacheKey, iconSource);

  if (ICON_CACHE.size > ICON_CACHE_LIMIT) {
    ICON_CACHE.delete(ICON_CACHE.keys().next().value);
  }
}

function getOutputSize(image) {
  const scale = Math.min(1, CRAB_ICON_MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight));

  return {
    width: Math.max(1, Math.round(image.naturalWidth * scale)),
    height: Math.max(1, Math.round(image.naturalHeight * scale)),
  };
}

export async function createCrabIcon(imageSource, hexColor, hatSource = "") {
  const normalizedColor = normalizeCrabProfile({ color: hexColor }).color;
  const cacheKey = `${imageSource}|${normalizedColor}|${hatSource}`;

  if (ICON_CACHE.has(cacheKey)) {
    return ICON_CACHE.get(cacheKey);
  }

  const image = await loadImage(imageSource);

  if (!image) {
    return imageSource;
  }

  const { width, height } = getOutputSize(image);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const crabCanvas = document.createElement("canvas");
  const crabContext = crabCanvas.getContext("2d");
  const targetColor = hexToRgb(normalizedColor);

  canvas.width = width;
  canvas.height = height;
  crabCanvas.width = width;
  crabCanvas.height = height;
  crabContext.drawImage(image, 0, 0, width, height);

  const imageData = crabContext.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];

    if (isCrabBodyPixel(red, green, blue, alpha)) {
      const shade = Math.max(red, green, blue) / 255;

      pixels[index] = Math.round(targetColor.red * shade);
      pixels[index + 1] = Math.round(targetColor.green * shade);
      pixels[index + 2] = Math.round(targetColor.blue * shade);
    }
  }

  crabContext.putImageData(imageData, 0, 0);
  context.drawImage(crabCanvas, 0, 0);

  if (hatSource) {
    const hat = await loadImage(hatSource);

    if (hat) {
      const hatWidth = canvas.width * 0.25;
      const hatHeight = hatWidth * (hat.naturalHeight / hat.naturalWidth);
      const hatX = (canvas.width - hatWidth) / 2;
      const hatY = canvas.height * 0.175;

      context.drawImage(hat, hatX, hatY, hatWidth, hatHeight);
    }
  }

  const iconSource = canvas.toDataURL("image/png");
  rememberIcon(cacheKey, iconSource);
  return iconSource;
}

export function recolorCrabIcon(imageSource, hexColor) {
  return createCrabIcon(imageSource, hexColor);
}
