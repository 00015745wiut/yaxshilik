import api from './api';

const statsService = {
  getPublicStats: () => api.get('/stats/public'),
};

export default statsService;
