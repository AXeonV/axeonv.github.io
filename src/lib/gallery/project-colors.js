// Golden-angle hues keep neighboring projects visually distinct without repeating a palette.
export const projectColor = (index) => `hsl(${(index * 137.508 + 18) % 360}, 96%, 65%)`;
