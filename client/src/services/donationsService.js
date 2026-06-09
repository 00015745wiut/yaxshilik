import api from './api';

const donationsService = {
  // Start a payment — returns { donation_id, checkout_url }. Redirect the
  // browser to checkout_url to pay on Multicard's hosted page.
  checkout:          (case_id, amount, message) => api.post('/donations/checkout', { case_id, amount, message }),
  // Poll a donation's payment status after returning from the gateway.
  getStatus:         (id)                        => api.get(`/donations/${id}/status`),
  getMyDonations:    ()                          => api.get('/donations/my'),
  getMyStats:        ()                          => api.get('/donations/my/stats'),
  getDonationsByCase:(caseId)                    => api.get(`/donations/case/${caseId}`),
  getRecentDonations:()                          => api.get('/donations/recent'),
};

export default donationsService;
