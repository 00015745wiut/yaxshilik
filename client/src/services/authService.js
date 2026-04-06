import api from './api';

const authService = {
  login:    (email, password)              => api.post('/auth/login',    { email, password }),
  register: (full_name, email, password)   => api.post('/auth/register', { full_name, email, password }),
  getMe:    ()                             => api.get('/auth/me'),
};

export default authService;
