// Legacy axios location — re-exports from the canonical lib/axios module.
// Components still importing from 'api/axios' will get the correct
// instance with withCredentials and refresh interceptor.
export { default } from '../lib/axios';
