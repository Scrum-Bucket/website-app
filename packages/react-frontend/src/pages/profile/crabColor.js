function hexToRgb(hexColor) {
  const normalizedColor = hexColor.replace("#", "");

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
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = imageSource;
  });
}

export async function createCrabIcon(imageSource, hexColor, hatSource = "") {
  const image = await loadImage(imageSource);

  if (!image) {
    return imageSource;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const crabCanvas = document.createElement("canvas");
  const crabContext = crabCanvas.getContext("2d");
  const targetColor = hexToRgb(hexColor);

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  crabCanvas.width = image.naturalWidth;
  crabCanvas.height = image.naturalHeight;
  crabContext.drawImage(image, 0, 0);

  const imageData = crabContext.getImageData(0, 0, crabCanvas.width, crabCanvas.height);
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

  if (hatSource) {
    const hat = await loadImage(hatSource);

    if (hat) {
      const hatWidth = canvas.width * 0.25;
      const hatHeight = hatWidth * (hat.naturalHeight / hat.naturalWidth);
      const hatX = (canvas.width - hatWidth) / 2;
      const hatY = canvas.height* 0.175;

      context.drawImage(hat, hatX, hatY, hatWidth, hatHeight);
    }
  }

  context.drawImage(crabCanvas, 0, 0);

  return canvas.toDataURL("image/png");
}

export function recolorCrabIcon(imageSource, hexColor) {
  return createCrabIcon(imageSource, hexColor);
}
