export const API_URL = (import.meta.env.VITE_API_URL as string) || http://localhost:5000';

const API_URL = import.meta.env.VITE_API_URL || API_URL;
const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || `${API_URL}/uploads`;
export const UPLOAD_URL = (import.meta.env.VITE_UPLOAD_URL as string) || `${import.meta.env.VITE_UPLOAD_URL || `${API_URL}/uploads`}';

const API_URL = import.meta.env.VITE_API_URL || API_URL;
const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || `${API_URL}/uploads`;
