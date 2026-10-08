export async function readApiResponse<T>(response: Response): Promise<T> {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Account service is currently unavailable. Please try again later.');
  }
  return response.json() as Promise<T>;
}
