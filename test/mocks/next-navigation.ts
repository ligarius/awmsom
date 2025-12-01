export const usePathname = jest.fn(() => "/");
export const useRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn()
});
export const useSearchParams = jest.fn(() => new URLSearchParams());
