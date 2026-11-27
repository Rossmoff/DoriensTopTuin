import type { Theme } from '../../state/uiStore';

export interface CanvasColors {
  background: string;
  plot: string;
  plotStroke: string;
  grid: string;
  gridMajor: string;
  text: string;
  textHalo: string;
  select: string;
  handle: string;
  handleStroke: string;
  measure: string;
  drawing: string;
  strokeWidth: number;
  /** Multiplier for object fills (contrast theme uses solid outlines). */
  fillOpacity: number;
}

export function canvasColors(theme: Theme): CanvasColors {
  switch (theme) {
    case 'dark':
      return {
        background: '#171b16', plot: '#232c21', plotStroke: '#9fc79a', grid: 'rgba(255,255,255,0.06)',
        gridMajor: 'rgba(255,255,255,0.14)', text: '#f1f5ee', textHalo: 'rgba(0,0,0,0.75)', select: '#ffa040',
        handle: '#ffffff', handleStroke: '#ffa040', measure: '#ffd54a', drawing: '#7cc283', strokeWidth: 1.5,
        fillOpacity: 0.85,
      };
    case 'contrast':
      return {
        background: '#ffffff', plot: '#ffffff', plotStroke: '#000000', grid: 'rgba(0,0,0,0.18)',
        gridMajor: 'rgba(0,0,0,0.45)', text: '#000000', textHalo: '#ffffff', select: '#e00000',
        handle: '#ffffff', handleStroke: '#e00000', measure: '#0000ff', drawing: '#0000ff', strokeWidth: 3,
        fillOpacity: 1,
      };
    default:
      return {
        background: '#e9e5d8', plot: '#f7f8ef', plotStroke: '#2f6b3a', grid: 'rgba(0,0,0,0.06)',
        gridMajor: 'rgba(0,0,0,0.16)', text: '#1f2a1c', textHalo: 'rgba(255,255,255,0.85)', select: '#f07800',
        handle: '#ffffff', handleStroke: '#f07800', measure: '#1b5fd1', drawing: '#2f6b3a', strokeWidth: 1.5,
        fillOpacity: 1,
      };
  }
}
