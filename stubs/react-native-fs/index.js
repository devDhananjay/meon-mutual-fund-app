/** Local stub so Metro can resolve leftover references without a native module. */
module.exports = {
  DocumentDirectoryPath: '',
  DownloadDirectoryPath: '',
  CachesDirectoryPath: '',
  downloadFile: () => ({promise: Promise.reject(new Error('react-native-fs stub'))}),
};
