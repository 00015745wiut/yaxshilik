import api from './api';

const casesService = {
  getCases:      (params)       => api.get('/cases',               { params }),
  getCaseById:   (id)           => api.get(`/cases/${id}`),
  createCase:    (formData)     => api.post('/cases',              formData),
  updateCase:    (id, formData) => api.put(`/cases/${id}`,         formData),
  deleteCase:    (id)           => api.delete(`/cases/${id}`),
  deleteProof:   (id, proofId)  => api.delete(`/cases/${id}/proofs/${proofId}`),
  getAdminStats: ()             => api.get('/cases/admin/stats'),
};

export default casesService;
