// src/frontend/src/utils/formatters.js
export const formatModelType = (modelType) => {
  if (modelType && modelType.startsWith('ModelType.')) {
    return modelType.substring('ModelType.'.length).toLowerCase().replace(/_/g, '-');
  }
  return modelType;
};
