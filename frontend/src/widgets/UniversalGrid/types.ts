import { Video, Channel, ChannelGroup } from '../../shared/types';

export type CardType = 'video' | 'channel' | 'channelGroup' | 'batch';

export type RenderMode = 'virtual' | 'standard';

export interface GridItem {
  _id?: string;
  id?: string;
}

export interface CustomAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedItems: T[]) => void;
  className?: string;
  disabled?: (selectedItems: T[]) => boolean;
}

export interface UniversalGridProps<T extends GridItem> {
  // 핵심 데이터
  data: T[];

  // 카드 렌더링 함수 (제네릭)
  renderCard: (item: T, props: CardRenderProps<T>) => React.ReactNode;

  // 상호작용 콜백 (간소화)
  onSelectionChange?: (selectedIds: string[]) => void;
  onDelete?: (item: T) => void;
  onBulkDelete?: (selectedItems: T[]) => void;
  onCardClick?: (item: T) => void;

  // 커스텀 액션 버튼들 (선택 모드 하단 바에 표시)
  customActions?: CustomAction<T>[];

  // 검색 기능
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  onSearchChange?: (searchTerm: string, filteredData: T[]) => void;

  // 페이지네이션 설정
  initialItemsPerPage?: number;
  showVirtualScrolling?: boolean;
  useWindowScroll?: boolean;

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

export interface CardRenderProps<T extends GridItem> {
  item: T;
  isSelected?: boolean;
  isSelectMode?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (item: T) => void;
  onCardClick?: (item: T) => void;
  cardWidth?: number;
}

// 기존 호환성을 위해 유지
export interface CardRendererProps<T extends GridItem> extends CardRenderProps<T> {}

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
  channelGroup: React.FC<CardRendererProps<ChannelGroup>>;
  batch: React.FC<CardRendererProps<any>>; // TODO: Batch 타입 추가 시 업데이트
};

export type GetItemId<T extends GridItem> = (item: T) => string;