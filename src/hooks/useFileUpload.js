import { useState, useCallback } from 'react';
import { ETLService } from '../services/ETLService';

export const useFileUpload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const uploadFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      const etl = new ETLService();
      const rawData = await etl.extractFromExcel(file);
      const transformedLoans = etl.transformToLoans(rawData);
      setData(transformedLoans);
      return transformedLoans;
    } catch (err) {
      setError(err.message || 'Failed to process file');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { uploadFile, loading, error, data };
};