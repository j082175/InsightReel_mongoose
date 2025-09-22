import { Video, Channel } from '../../shared/types';

export type CardType = 'video' | 'channel' | 'batch';

export type RenderMode = 'virtual' | 'standard';

export interface GridItem {
  _id?: string;
  id?: string;
}

export interface UniversalGridProps<T extends GridItem> {
  // 핵심 데이터
  data: T[];
  cardType: CardType;

  // 상호작용 콜백 (간소화)
  onSelectionChange?: (selectedIds: string[]) => void;
  onDelete?: (item: T) => void;
  onBulkDelete?: (selectedItems: T[]) => void;
  onCardClick?: (item: T) => void;

  // 페이지네이션 설정
  initialItemsPerPage?: number;
  showVirtualScrolling?: boolean;

  // 그리드 설정
  gridSize?: 1 | 2 | 3;
  containerWidth?: number;
  containerHeight?: number;

  // 스타일링
  className?: string;
  headerClassName?: string;
  gridClassName?: string;
  footerClassName?: string;
}

export interface CardRendererProps<T extends GridItem> {
  item: T;
  isSelected?: boolean;
  isSelectMode?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (item: T) => void;
  onCardClick?: (item: T) => void;
}

export interface GridLayoutHook {
  renderMode: RenderMode;
  useVirtualScrolling: boolean;
  gridSize: number;
  toggleVirtualization: () => void;
  setGridSize: (size: number) => void;
}

export interface UniversalPaginationOptions {
  initialItemsPerPage?: number;
  initialPage?: number;
}

export interface UniversalPaginationResult<T> {
  // 데이터
  currentData: T[];
  paginatedData: T[];

  // 상태
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
  useVirtualScrolling: boolean;

  // 페이지네이션 액션
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;

  // 가상화 액션
  toggleVirtualization: () => void;

  // 유틸리티
  hasNextPage: boolean;
  hasPrevPage: boolean;
  startIndex: number;
  endIndex: number;
}

// 카드 렌더러 타입 맵핑
export type CardRendererMap = {
  video: React.FC<CardRendererProps<Video>>;
  channel: React.FC<CardRendererProps<Channel>>;
  batch: React.FC<CardRendererProps<any>>; // TODO: Batch 타입 추가 시 업데이트
};

export type GetItemId<T extends GridItem> = (item: T) => string;