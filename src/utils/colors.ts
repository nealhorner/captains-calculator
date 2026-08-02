export const carColorsMap: Record<string, string> = {
  Beige: '#f5f5dc',
  Black: '#000000',
  Blue: '#0000FF',
  Brown: '#a52a2a',
  Gold: '#ffd700',
  Gray: '#808080',
  Green: '#008000',
  Orange: '#ffa500',
  Purple: '#800080',
  Red: '#FF0000',
  Silver: '#c0c0c0',
  White: '#FFFFFF',
  Yellow: '#ffff00',
};

export const carColorsContrastMap: Record<string, string> = {
  Beige: '#212121',
  Black: '#FFFFFF',
  Blue: '#FFFFFF',
  Brown: '#FFFFFF',
  Gold: '#212121',
  Gray: '#FFFFFF',
  Green: '#FFFFFF',
  Orange: '#212121',
  Purple: '#FFFFFF',
  Red: '#FFFFFF',
  Silver: '#212121',
  White: '#212121',
  Yellow: '#212121',
};

export function generateDarkColorHex() {
  let color = '#';
  for (let i = 0; i < 3; i++)
    color += ('0' + Math.floor((Math.random() * Math.pow(16, 2)) / 2).toString(16)).slice(-2);
  return color;
}

export function generateRandomColorHex() {
  return '#' + ('00000' + Math.floor(Math.random() * Math.pow(16, 6)).toString(16)).slice(-6);
}

export function generateLightColorHex() {
  let color = '#';
  for (let i = 0; i < 3; i++)
    color += ('0' + Math.floor(((1 + Math.random()) * Math.pow(16, 2)) / 2).toString(16)).slice(-2);
  return color;
}

/**
 * A stable colour derived from a string, so the same key always gets the same
 * colour. Used for graph edges: a random colour per render makes them flicker
 * every time the chain is re-sized.
 */
export function colorFromKey(key: string, scheme: 'light' | 'dark' = 'light') {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  // Dark scheme needs lighter strokes to stay visible against the background.
  return scheme === 'light' ? `hsl(${hue}, 65%, 35%)` : `hsl(${hue}, 70%, 65%)`;
}
