function safeErrorMetadata(error, context = {}) {
  return {
    errorType: error?.constructor?.name,
    status: error?.status || error?.response?.status,
    ...context
  };
}

module.exports = { safeErrorMetadata };
