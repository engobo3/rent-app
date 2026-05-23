import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SignaturePad } from './SignaturePad';

describe('SignaturePad', () => {
    const mockOnSign = vi.fn();
    const mockOnCancel = vi.fn();

    // Shared mock context so component and test reference the same object
    let mockCtx: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockCtx = {
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            clearRect: vi.fn(),
            scale: vi.fn(),
            // configureCanvas resets the transform before scaling.
            setTransform: vi.fn(),
        };
        // Mock canvas getContext since jsdom doesn't have canvas
        HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;

        HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockdata');

        // Mock getBoundingClientRect
        HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
            left: 0, top: 0, right: 400, bottom: 200,
            width: 400, height: 200, x: 0, y: 0, toJSON: () => {},
        }));
    });

    it('renders modal with title and instructions', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);

        expect(screen.getByText('Sign Lease Agreement')).toBeInTheDocument();
        expect(screen.getByText(/Draw your signature/i)).toBeInTheDocument();
    });

    it('renders Sign Here placeholder when not drawn', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        expect(screen.getByText('Sign here')).toBeInTheDocument();
    });

    it('disables sign button when no drawing', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        const signBtn = screen.getByText('Sign Lease');
        expect(signBtn).toBeDisabled();
    });

    it('enables sign button after drawing', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        const canvas = document.querySelector('canvas')!;

        // Simulate mousedown to start drawing
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
        fireEvent.mouseUp(canvas);

        const signBtn = screen.getByText('Sign Lease');
        expect(signBtn).not.toBeDisabled();
    });

    it('hides Sign Here placeholder after drawing', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        const canvas = document.querySelector('canvas')!;

        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
        fireEvent.mouseUp(canvas);

        expect(screen.queryByText('Sign here')).not.toBeInTheDocument();
    });

    it('calls onSign with data URL when sign button clicked', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        const canvas = document.querySelector('canvas')!;

        // Draw
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
        fireEvent.mouseUp(canvas);

        // Sign
        fireEvent.click(screen.getByText('Sign Lease'));

        expect(mockOnSign).toHaveBeenCalledWith('data:image/png;base64,mockdata');
    });

    it('does not call onSign when no drawing', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        fireEvent.click(screen.getByText('Sign Lease'));
        expect(mockOnSign).not.toHaveBeenCalled();
    });

    it('clears canvas when clear button clicked', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        const canvas = document.querySelector('canvas')!;

        // Draw first
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
        fireEvent.mouseUp(canvas);
        expect(screen.getByText('Sign Lease')).not.toBeDisabled();

        // Clear
        fireEvent.click(screen.getByText('Clear'));

        // Sign button should be disabled again
        expect(screen.getByText('Sign Lease')).toBeDisabled();
        // Placeholder should reappear
        expect(screen.getByText('Sign here')).toBeInTheDocument();
    });

    it('calls onCancel when cancel button clicked', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when X button clicked', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        fireEvent.click(screen.getByText('x'));
        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onCancel when overlay clicked', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        const overlay = document.querySelector('.modal-overlay')!;
        fireEvent.click(overlay);
        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not cancel when modal content clicked', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        const content = document.querySelector('.modal-content')!;
        fireEvent.click(content);
        // onCancel should only be called once (overlay delegates, but stopPropagation prevents it)
        expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('handles mouse move for drawing', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        const canvas = document.querySelector('canvas')!;

        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
        fireEvent.mouseMove(canvas, { clientX: 150, clientY: 80 });
        fireEvent.mouseMove(canvas, { clientX: 200, clientY: 100 });
        fireEvent.mouseUp(canvas);

        expect(mockCtx.lineTo).toHaveBeenCalled();
        expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('stops drawing on mouseLeave', () => {
        render(<SignaturePad onSign={mockOnSign} onCancel={mockOnCancel} />);
        const canvas = document.querySelector('canvas')!;

        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
        fireEvent.mouseLeave(canvas);
        // After mouseleave, move should not draw
        fireEvent.mouseMove(canvas, { clientX: 200, clientY: 100 });

        // The key assertion: no stroke calls after leave
        const strokeCallCount = mockCtx.stroke.mock.calls.length;
        fireEvent.mouseMove(canvas, { clientX: 250, clientY: 120 });
        expect(mockCtx.stroke.mock.calls.length).toBe(strokeCallCount);
    });
});
