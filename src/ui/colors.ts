// Course colours are CSS variables so light and dark themes can tune them.
const COUNT = 8;
export const courseColor = (index: number) => `var(--c${index % COUNT})`;
