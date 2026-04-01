import apiClient from './apiClient';

/** End-user login — same contract as web `authServices.login` */
export async function loginWithCredentials(uccCode, password) {
  return apiClient.post('/api/journey/mf/auth/login/', {
    ucc_code: uccCode,
    password,
  });
}
