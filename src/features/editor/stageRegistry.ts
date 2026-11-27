import type Konva from 'konva';

/** The live Konva stage, for PNG export. */
let current: Konva.Stage | null = null;
export const setStage = (s: Konva.Stage | null) => {
  current = s;
};
export const getStage = () => current;
