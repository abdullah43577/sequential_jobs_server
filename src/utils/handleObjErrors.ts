export const handleObjErrors = function (obj: Record<string, string>) {
  let errorMsg: Record<string, any> = {};
  let isValid = true;

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      errorMsg[key] = `Please ${key} must be provided`;
      isValid = false;
    }
  }
  return {
    errorMsg,
    isValid,
  };
};
