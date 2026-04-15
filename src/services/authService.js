import apiClient from './apiClient';

/** End-user login — same contract as web `authServices.login` */
export async function loginWithCredentials(uccCode, password) {
  return apiClient.post('/api/journey/mf/auth/login/', {
    ucc_code: uccCode,
    password,
  });
}

/** Logged-in profile (includes company branding like company_logo). */
export async function fetchAuthProfile() {
  return apiClient.get('/api/journey/mf/auth/profile/');
}

/** Change password for logged-in user. */
export async function changePassword({current_password, new_password, confirm_password}) {
  return apiClient.put('/api/journey/mf/user/changePassword/', {
    current_password,
    new_password,
    confirm_password,
  });
}
