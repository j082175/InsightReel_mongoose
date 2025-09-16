import React from 'react';
import { screen } from '@testing-library/react';
import { render, userEvent } from '../../../__tests__/utils/test-utils';
import SearchBar from '../SearchBar';

describe('SearchBar', () => {
  const defaultProps = {
    searchTerm: '',
    onSearchChange: jest.fn(),
    onSearch: jest.fn(),
    placeholder: '검색어를 입력하세요',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    test('검색 입력 필드가 표시된다', () => {
      render(<SearchBar {...defaultProps} />);

      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute(
        'placeholder',
        defaultProps.placeholder
      );
    });

    test('검색 버튼이 표시된다', () => {
      render(<SearchBar {...defaultProps} />);

      const searchButton = screen.getByRole('button', { name: /검색/i });
      expect(searchButton).toBeInTheDocument();
    });

    test('초기 검색어가 올바르게 표시된다', () => {
      const searchTerm = '테스트 검색어';
      render(<SearchBar {...defaultProps} searchTerm={searchTerm} />);

      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveValue(searchTerm);
    });
  });

  describe('검색 기능 테스트', () => {
    test('검색어 입력 시 onSearchChange가 호출된다', async () => {
      const mockOnSearchChange = jest.fn();
      const user = userEvent.setup();

      render(
        <SearchBar {...defaultProps} onSearchChange={mockOnSearchChange} />
      );

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, '테스트');

      // 각 문자 입력마다 호출되므로 마지막 호출 확인
      expect(mockOnSearchChange).toHaveBeenLastCalledWith('테스트');
    });

    test('검색 버튼 클릭 시 onSearch가 호출된다', async () => {
      const mockOnSearch = jest.fn();
      const user = userEvent.setup();

      render(<SearchBar {...defaultProps} onSearch={mockOnSearch} />);

      const searchButton = screen.getByRole('button', { name: /검색/i });
      await user.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith(defaultProps.searchTerm);
    });

    test('Enter 키 입력 시 onSearch가 호출된다', async () => {
      const mockOnSearch = jest.fn();
      const user = userEvent.setup();

      render(
        <SearchBar
          {...defaultProps}
          searchTerm="테스트"
          onSearch={mockOnSearch}
        />
      );

      const searchInput = screen.getByRole('textbox');
      await user.type(searchInput, '{enter}');

      expect(mockOnSearch).toHaveBeenCalledWith('테스트');
    });

    test('빈 검색어로도 검색이 가능하다', async () => {
      const mockOnSearch = jest.fn();
      const user = userEvent.setup();

      render(<SearchBar {...defaultProps} onSearch={mockOnSearch} />);

      const searchButton = screen.getByRole('button', { name: /검색/i });
      await user.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith('');
    });
  });

  describe('결과 정보 표시', () => {
    test('totalResults가 제공되면 결과 개수가 표시된다', () => {
      render(<SearchBar {...defaultProps} totalResults={150} />);

      expect(screen.getByText(/150개/)).toBeInTheDocument();
    });

    test('결과가 0개일 때도 올바르게 표시된다', () => {
      render(<SearchBar {...defaultProps} totalResults={0} />);

      expect(screen.getByText(/0개/)).toBeInTheDocument();
    });
  });

  describe('필터 기능 테스트', () => {
    test('showFilters가 true이면 필터 영역이 표시된다', () => {
      render(
        <SearchBar {...defaultProps} showFilters={true}>
          <select data-testid="filter-select">
            <option value="">전체</option>
            <option value="youtube">YouTube</option>
          </select>
        </SearchBar>
      );

      expect(screen.getByTestId('filter-select')).toBeInTheDocument();
    });

    test('showFilters가 false이면 필터 영역이 표시되지 않는다', () => {
      render(
        <SearchBar {...defaultProps} showFilters={false}>
          <select data-testid="filter-select">
            <option value="">전체</option>
          </select>
        </SearchBar>
      );

      expect(screen.queryByTestId('filter-select')).not.toBeInTheDocument();
    });
  });

  describe('로딩 상태 테스트', () => {
    test('loading이 true이면 검색 버튼이 비활성화된다', () => {
      render(<SearchBar {...defaultProps} loading={true} />);

      const searchButton = screen.getByRole('button', { name: /검색/i });
      expect(searchButton).toBeDisabled();
    });

    test('loading이 true이면 로딩 텍스트가 표시된다', () => {
      render(<SearchBar {...defaultProps} loading={true} />);

      expect(screen.getByText(/검색 중.../i)).toBeInTheDocument();
    });

    test('loading이 false이면 검색 버튼이 활성화된다', () => {
      render(<SearchBar {...defaultProps} loading={false} />);

      const searchButton = screen.getByRole('button', { name: /검색/i });
      expect(searchButton).not.toBeDisabled();
    });
  });

  describe('접근성 테스트', () => {
    test('검색 입력 필드에 적절한 라벨이 연결되어 있다', () => {
      render(<SearchBar {...defaultProps} />);

      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAccessibleName();
    });

    test('검색 버튼이 키보드로 접근 가능하다', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const searchButton = screen.getByRole('button', { name: /검색/i });

      // Tab으로 포커스 이동
      await user.tab();
      await user.tab(); // 입력 필드 다음이 버튼

      expect(searchButton).toHaveFocus();
    });

    test('로딩 상태일 때 적절한 aria 속성이 설정된다', () => {
      render(<SearchBar {...defaultProps} loading={true} />);

      const searchButton = screen.getByRole('button', { name: /검색/i });
      expect(searchButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('에러 상태 테스트', () => {
    test('에러 메시지가 제공되면 표시된다', () => {
      const errorMessage = '검색 중 오류가 발생했습니다';
      render(<SearchBar {...defaultProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    test('에러 상태에서도 검색이 가능하다', async () => {
      const mockOnSearch = jest.fn();
      const user = userEvent.setup();

      render(
        <SearchBar
          {...defaultProps}
          error="오류 메시지"
          onSearch={mockOnSearch}
        />
      );

      const searchButton = screen.getByRole('button', { name: /검색/i });
      await user.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalled();
    });
  });
});
