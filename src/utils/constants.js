export const LOAN_STATUS = {
  CURRENT: 'current',
  DELINQUENT_1: 'delinquent_1',
  DELINQUENT_2: 'delinquent_2',
  DELINQUENT_3: 'delinquent_3',
  DEFAULT: 'default',
  RESTRUCTURED: 'restructured'
};

export const STATUS_COLORS = {
  [LOAN_STATUS.CURRENT]: 'green',
  [LOAN_STATUS.DELINQUENT_1]: 'yellow',
  [LOAN_STATUS.DELINQUENT_2]: 'orange',
  [LOAN_STATUS.DELINQUENT_3]: 'orange',
  [LOAN_STATUS.DEFAULT]: 'red',
  [LOAN_STATUS.RESTRUCTURED]: 'red'
};

export const RISK_LEVELS = {
  LOW: { min: 0, max: 30, color: 'green' },
  MEDIUM: { min: 30, max: 70, color: 'yellow' },
  HIGH: { min: 70, max: 100, color: 'red' }
};