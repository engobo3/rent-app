import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { MemoryRouter } from 'react-router-dom';
import * as auth from 'firebase/auth';

// Mock firebase
vi.mock('./firebase', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  getAuth: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as object,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    // There are two "Sign In" buttons: the tab toggle and the submit button
    const signInButtons = screen.getAllByRole('button', { name: /sign in/i });
    expect(signInButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('handles input changes', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('submits form and navigates on success', async () => {
    (auth.signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    const submitBtn = screen.getAllByRole('button', { name: /sign in/i }).find(btn => btn.getAttribute('type') === 'submit')!;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(auth.signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@example.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error on login failure', async () => {
    const toast = await import('react-hot-toast');
    (auth.signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Invalid credentials'));

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpassword' } });
    const submitBtn = screen.getAllByRole('button', { name: /sign in/i }).find(btn => btn.getAttribute('type') === 'submit')!;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith(expect.stringContaining('Login failed:'));
    });
  });
});
