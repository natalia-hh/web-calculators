export type Direction = "long" | "short";

export type PriceInputMode = "price" | "percent";

export type LastEditedField = "riskPercent" | "positionSize";

export type PositionRiskMarginFormState = {
  accountSize: string;
  riskPercent: string;
  positionSize: string;
  leverage: string;
  maintenanceMarginRate: string;
  entryFeeRate: string;
  exitFeeRate: string;
  direction: Direction;
  entryPrice: string;
  takeProfitMode: PriceInputMode;
  takeProfitValue: string;
  stopLossMode: PriceInputMode;
  stopLossValue: string;
  lastEditedField: LastEditedField;
};

export type PositionRiskMarginField = keyof Omit<PositionRiskMarginFormState, "lastEditedField">;

export type PositionRiskMarginValues = {
  direction: Direction;
  accountSize: number;
  riskPercent: number;
  riskAmount: number;
  positionSize: number;
  leverage: number;
  maintenanceMarginRatePercent: number;
  entryFeePercent: number;
  exitFeePercent: number;
  maintenanceMarginRate: number;
  entryFeeRate: number;
  exitFeeRate: number;
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  takeProfitDistancePercent: number;
  stopLossDistancePercent: number;
  positionUnits: number;
  marginSize: number;
  entryFee: number;
  exitFeeAtTakeProfit: number;
  exitFeeAtStopLoss: number;
  maxExitFee: number;
  grossProfitAtTakeProfit: number;
  netProfitAtTakeProfit: number;
  grossLossAtStopLoss: number;
  netLossAtStopLoss: number;
  rewardRiskRatio: number;
  breakEvenPrice: number;
  estimatedLiquidationPrice: number;
};

export type ValidationResult = {
  issues: string[];
  invalidFields: Partial<Record<PositionRiskMarginField, boolean>>;
};
