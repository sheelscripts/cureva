export const delay = <T>(data: T, ms: number): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
};
