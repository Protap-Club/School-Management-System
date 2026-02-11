<<<<<<< HEAD
// Legacy axios location — re-exports from the canonical lib/axios module.
// Components still importing from 'api/axios' will get the correct
// instance with withCredentials and refresh interceptor.
=======
// Legacy Axios — re-exports from the canonical lib/axios instance
// This ensures all consumers get withCredentials, refresh interceptor, etc.
>>>>>>> fix
export { default } from '../lib/axios';
