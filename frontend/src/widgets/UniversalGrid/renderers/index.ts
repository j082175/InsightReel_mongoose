import { VideoRenderer } from './VideoRenderer';
import { CardType, CardRendererMap } from '../types';

// 카드 타입별 렌더러 맵핑
export const cardRenderers: Record<CardType, React.FC<any>> = {
  video: VideoRenderer,
  channel: VideoRenderer, // TODO: ChannelRenderer 구현 시 교체
  batch: VideoRenderer,   // TODO: BatchRenderer 구현 시 교체
};

/**
 * 카드 타입에 맞는 렌더러를 반환하는 팩토리 함수
 */
export const getCardRenderer = (cardType: CardType) => {
  const renderer = cardRenderers[cardType];

  if (!renderer) {
    console.warn(`Unknown card type: ${cardType}, falling back to video renderer`);
    return VideoRenderer;
  }

  return renderer;
};

// 개별 렌더러 export
export { VideoRenderer } from './VideoRenderer';