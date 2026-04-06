import api from './api';

const donationsService = {
  createDonation:    (case_id, amount, message) => api.post('/donations',             { case_id, amount, message }),
  getMyDonations:    ()                         => api.get('/donations/my'),
  getMyStats:        ()                         => api.get('/donations/my/stats'),
  getDonationsByCase:(caseId)                   => api.get(`/donations/case/${caseId}`),
  getRecentDonations:()                         => api.get('/donations/recent'),
};

export default donationsService;
