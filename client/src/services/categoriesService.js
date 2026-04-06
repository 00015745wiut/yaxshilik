import api from './api';

const categoriesService = {
  getCategories: () => api.get('/categories'),
};

export default categoriesService;
