const getTrimestre = (month) => {
    if (month >= 1 && month <= 4) return 1;
    if (month >= 5 && month <= 8) return 2;
    return 3;
  };
  
  const getTypeLabel = (type) => {
    const typeMap = {
      'hotel': 'Hôtel',
      'grand-surface': 'Grand Surface',
      'media': 'Télé/Radio',
      'bus': 'Bus',
      'nightclub': 'Night club',
      'occ': 'OCC'
    };
    return typeMap[type] || type;
  };
  
  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date);
  };
  
  module.exports = {
    getTrimestre,
    getTypeLabel,
    formatDate
  };