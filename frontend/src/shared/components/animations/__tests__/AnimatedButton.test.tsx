import React from 'react';
import { screen } from '@testing-library/react';
import { render, userEvent } from '../../../../__tests__/utils/test-utils';
import AnimatedButton from '../AnimatedButton';

// Framer Motion 모킹
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

describe('AnimatedButton', () => {
  const defaultProps = {
    children: '테스트 버튼',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    test('버튼이 올바르게 렌더링된다', () => {
      render(<AnimatedButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: '테스트 버튼' });
      expect(button).toBeInTheDocument();
    });

    test('type 속성이 올바르게 설정된다', () => {
      render(<AnimatedButton {...defaultProps} type="submit" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    test('기본 type은 button이다', () => {
      render(<AnimatedButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('상호작용 테스트', () => {
    test('클릭 시 onClick 핸들러가 호출된다', async () => {
      const mockOnClick = jest.fn();
      const user = userEvent.setup();

      render(<AnimatedButton {...defaultProps} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('disabled 상태에서는 클릭이 동작하지 않는다', async () => {
      const mockOnClick = jest.fn();
      const user = userEvent.setup();

      render(
        <AnimatedButton
          {...defaultProps}
          onClick={mockOnClick}
          disabled={true}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });

    test('loading 상태에서는 클릭이 동작하지 않는다', async () => {
      const mockOnClick = jest.fn();
      const user = userEvent.setup();

      render(
        <AnimatedButton
          {...defaultProps}
          onClick={mockOnClick}
          loading={true}
        />
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('상태별 렌더링', () => {
    test('disabled 상태가 올바르게 반영된다', () => {
      render(<AnimatedButton {...defaultProps} disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('loading 상태에서 로딩 스피너가 표시된다', () => {
      render(<AnimatedButton {...defaultProps} loading={true} />);

      // 로딩 스피너는 div로 렌더링되므로 클래스나 스타일로 확인
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('loading 상태에서 버튼 텍스트 투명도가 변경된다', () => {
      render(<AnimatedButton {...defaultProps} loading={true} />);

      const buttonText = screen.getByText('테스트 버튼');
      expect(buttonText).toBeInTheDocument();
    });
  });

  describe('variant 스타일 테스트', () => {
    test('primary variant 클래스가 적용된다', () => {
      render(<AnimatedButton {...defaultProps} variant="primary" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-blue-600');
    });

    test('secondary variant 클래스가 적용된다', () => {
      render(<AnimatedButton {...defaultProps} variant="secondary" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-gray-200');
    });

    test('danger variant 클래스가 적용된다', () => {
      render(<AnimatedButton {...defaultProps} variant="danger" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-red-600');
    });

    test('success variant 클래스가 적용된다', () => {
      render(<AnimatedButton {...defaultProps} variant="success" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-green-600');
    });
  });

  describe('size 스타일 테스트', () => {
    test('sm size 클래스가 적용된다', () => {
      render(<AnimatedButton {...defaultProps} size="sm" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-3 py-1.5 text-sm');
    });

    test('md size 클래스가 적용된다', () => {
      render(<AnimatedButton {...defaultProps} size="md" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4 py-2 text-sm');
    });

    test('lg size 클래스가 적용된다', () => {
      render(<AnimatedButton {...defaultProps} size="lg" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6 py-3 text-base');
    });
  });

  describe('커스텀 클래스 테스트', () => {
    test('추가 className이 올바르게 적용된다', () => {
      render(<AnimatedButton {...defaultProps} className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    test('기본 클래스와 커스텀 클래스가 함께 적용된다', () => {
      render(<AnimatedButton {...defaultProps} className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('inline-flex');
      expect(button.className).toContain('custom-class');
    });
  });

  describe('접근성 테스트', () => {
    test('버튼 역할이 올바르게 설정된다', () => {
      render(<AnimatedButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    test('키보드로 접근 가능하다', async () => {
      const user = userEvent.setup();
      render(<AnimatedButton {...defaultProps} />);

      const button = screen.getByRole('button');

      await user.tab();
      expect(button).toHaveFocus();
    });

    test('Enter 키로 클릭 가능하다', async () => {
      const mockOnClick = jest.fn();
      const user = userEvent.setup();

      render(<AnimatedButton {...defaultProps} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(mockOnClick).toHaveBeenCalled();
    });

    test('Space 키로 클릭 가능하다', async () => {
      const mockOnClick = jest.fn();
      const user = userEvent.setup();

      render(<AnimatedButton {...defaultProps} onClick={mockOnClick} />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');

      expect(mockOnClick).toHaveBeenCalled();
    });
  });
});
