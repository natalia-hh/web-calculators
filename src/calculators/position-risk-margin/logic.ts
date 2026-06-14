import type {
  Direction,
  PositionRiskMarginField,
  PositionRiskMarginFormState,
  PositionRiskMarginValues,
  PriceInputMode,
  ValidationResult
} from "./types";

const defaults: PositionRiskMarginFormState = {
  accountSize: "1000",
  riskPercent: "1",
  positionSize: "",
  leverage: "10",
  maintenanceMarginRate: "0.5",
  entryFeeRate: "0.06",
  exitFeeRate: "0.06",
  direction: "long",
  entryPrice: "100",
  takeProfitMode: "percent",
  takeProfitValue: "1.26",
  stopLossMode: "percent",
  stopLossValue: "0.81",
  lastEditedField: "riskPercent"
};

export const emptyState: PositionRiskMarginFormState = {
  accountSize: "",
  riskPercent: "",
  positionSize: "",
  leverage: "",
  maintenanceMarginRate: "",
  entryFeeRate: "",
  exitFeeRate: "",
  direction: "long",
  entryPrice: "",
  takeProfitMode: "price",
  takeProfitValue: "",
  stopLossMode: "price",
  stopLossValue: "",
  lastEditedField: "riskPercent"
};

export const toNumber = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const isBlank = (value: string) => value.trim() === "";

const isValidNumber = (value: string) => value.trim() !== "" && Number.isFinite(Number(value));

export const formatNumber = (value: number, maximumFractionDigits = 2, minimumFractionDigits = 0) => {
  if (!Number.isFinite(value)) return "0";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
};

export const formatMoney = (value: number) => `${formatNumber(value, 2, 2)} USDT`;
export const formatPrice = (value: number) => `${formatNumber(value, 4)} USDT`;
export const formatPercent = (value: number) => `${formatNumber(value, 2, 2)}%`;
export const formatUnits = (value: number) => formatNumber(value, 8);

export const numberInputValue = (value: number, maximumFractionDigits = 6) => {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toFixed(maximumFractionDigits).replace(/\.?0+$/, "");
};

function resolvePrice(
  entryPrice: number,
  mode: PriceInputMode,
  value: number,
  direction: Direction,
  target: "takeProfit" | "stopLoss"
) {
  if (mode === "price") return value;

  if (direction === "long") {
    return target === "takeProfit"
      ? entryPrice * (1 + value / 100)
      : entryPrice * (1 - value / 100);
  }

  return target === "takeProfit"
    ? entryPrice * (1 - value / 100)
    : entryPrice * (1 + value / 100);
}

function getResolvedPrices(form: PositionRiskMarginFormState) {
  const entryPrice = toNumber(form.entryPrice);
  const takeProfitValue = toNumber(form.takeProfitValue);
  const stopLossValue = toNumber(form.stopLossValue);

  return {
    entryPrice,
    takeProfitPrice: resolvePrice(
      entryPrice,
      form.takeProfitMode,
      takeProfitValue,
      form.direction,
      "takeProfit"
    ),
    stopLossPrice: resolvePrice(entryPrice, form.stopLossMode, stopLossValue, form.direction, "stopLoss")
  };
}

function getEffectiveRiskPercent(form: PositionRiskMarginFormState) {
  const { entryPrice, stopLossPrice } = getResolvedPrices(form);
  const entryFeeRate = toNumber(form.entryFeeRate) / 100;
  const exitFeeRate = toNumber(form.exitFeeRate) / 100;

  if (entryPrice <= 0 || stopLossPrice <= 0 || entryFeeRate < 0 || exitFeeRate < 0) return 0;

  const priceLoss =
    form.direction === "long"
      ? (entryPrice - stopLossPrice) / entryPrice
      : (stopLossPrice - entryPrice) / entryPrice;

  return priceLoss + entryFeeRate + (stopLossPrice / entryPrice) * exitFeeRate;
}

function canSyncFromRisk(form: PositionRiskMarginFormState) {
  const accountSize = toNumber(form.accountSize);
  const riskPercent = toNumber(form.riskPercent);
  const effectiveRiskPercent = getEffectiveRiskPercent(form);

  return accountSize > 0 && riskPercent > 0 && effectiveRiskPercent > 0;
}

function canSyncFromPositionSize(form: PositionRiskMarginFormState) {
  const values = calculateNetLossFromPositionSize(form);

  return values !== null && values.accountSize > 0 && values.netLossAtStopLoss > 0;
}

function calculateNetLossFromPositionSize(form: PositionRiskMarginFormState) {
  const accountSize = toNumber(form.accountSize);
  const positionSize = toNumber(form.positionSize);
  const entryFeeRate = toNumber(form.entryFeeRate) / 100;
  const exitFeeRate = toNumber(form.exitFeeRate) / 100;
  const { entryPrice, stopLossPrice } = getResolvedPrices(form);

  if (
    accountSize <= 0 ||
    positionSize <= 0 ||
    entryPrice <= 0 ||
    stopLossPrice <= 0 ||
    entryFeeRate < 0 ||
    exitFeeRate < 0
  ) {
    return null;
  }

  const stopLossIsValid =
    form.direction === "long" ? stopLossPrice < entryPrice : stopLossPrice > entryPrice;

  if (!stopLossIsValid) return null;

  const positionUnits = positionSize / entryPrice;
  const grossLossAtStopLoss =
    form.direction === "long"
      ? positionUnits * (entryPrice - stopLossPrice)
      : positionUnits * (stopLossPrice - entryPrice);
  const entryFee = positionSize * entryFeeRate;
  const exitFeeAtStopLoss = positionUnits * stopLossPrice * exitFeeRate;

  return {
    accountSize,
    netLossAtStopLoss: grossLossAtStopLoss + entryFee + exitFeeAtStopLoss
  };
}

function syncRiskAndPosition(form: PositionRiskMarginFormState): PositionRiskMarginFormState {
  const next = { ...form };

  if (next.lastEditedField === "riskPercent" && canSyncFromRisk(next)) {
    const accountSize = toNumber(next.accountSize);
    const riskPercent = toNumber(next.riskPercent);
    const riskAmount = accountSize * (riskPercent / 100);
    next.positionSize = numberInputValue(riskAmount / getEffectiveRiskPercent(next), 6);
  }

  if (next.lastEditedField === "positionSize" && canSyncFromPositionSize(next)) {
    const values = calculateNetLossFromPositionSize(next);
    next.riskPercent = values
      ? numberInputValue((values.netLossAtStopLoss / values.accountSize) * 100, 6)
      : next.riskPercent;
  }

  return next;
}

export const initialState = syncRiskAndPosition(defaults);

export function getNextFormState(
  current: PositionRiskMarginFormState,
  field: PositionRiskMarginField,
  value: string
) {
  const next: PositionRiskMarginFormState = { ...current, [field]: value };

  if (field === "riskPercent") {
    next.lastEditedField = "riskPercent";
  }

  if (field === "positionSize") {
    next.lastEditedField = "positionSize";
  }

  return syncRiskAndPosition(next);
}

export function getValidation(form: PositionRiskMarginFormState): ValidationResult {
  const issues: string[] = [];
  const invalidFields: Partial<Record<PositionRiskMarginField, boolean>> = {};
  const requiredFields: Array<[PositionRiskMarginField, string]> = [
    ["accountSize", "Account Size is required."],
    ["riskPercent", "Risk % is required."],
    ["positionSize", "Position Size USDT is required."],
    ["leverage", "Leverage is required."],
    ["maintenanceMarginRate", "Maintenance Margin Rate % is required."],
    ["entryFeeRate", "Entry Fee % is required."],
    ["exitFeeRate", "Exit Fee % is required."],
    ["entryPrice", "Entry Price is required."],
    ["takeProfitValue", "Take Profit is required."],
    ["stopLossValue", "Stop Loss is required."]
  ];

  requiredFields.forEach(([field, message]) => {
    if (isBlank(String(form[field]))) {
      issues.push(message);
      invalidFields[field] = true;
    }
  });

  const positiveFields: Array<[PositionRiskMarginField, string]> = [
    ["accountSize", "Account Size must be greater than 0."],
    ["riskPercent", "Risk % must be greater than 0."],
    ["positionSize", "Position Size USDT must be greater than 0."],
    ["leverage", "Leverage must be greater than 0."],
    ["entryPrice", "Entry Price must be greater than 0."],
    ["takeProfitValue", "Take Profit must be greater than 0."],
    ["stopLossValue", "Stop Loss must be greater than 0."]
  ];

  positiveFields.forEach(([field, message]) => {
    if (!isBlank(String(form[field])) && (!isValidNumber(String(form[field])) || toNumber(String(form[field])) <= 0)) {
      issues.push(message);
      invalidFields[field] = true;
    }
  });

  const nonNegativeFields: Array<[PositionRiskMarginField, string]> = [
    ["entryFeeRate", "Entry Fee % cannot be negative."],
    ["exitFeeRate", "Exit Fee % cannot be negative."],
    ["maintenanceMarginRate", "Maintenance Margin Rate % cannot be negative."]
  ];

  nonNegativeFields.forEach(([field, message]) => {
    if (!isBlank(String(form[field])) && (!isValidNumber(String(form[field])) || toNumber(String(form[field])) < 0)) {
      issues.push(message);
      invalidFields[field] = true;
    }
  });

  const { entryPrice, takeProfitPrice, stopLossPrice } = getResolvedPrices(form);

  if (entryPrice > 0 && takeProfitPrice > 0 && stopLossPrice > 0) {
    if (form.direction === "long") {
      if (takeProfitPrice <= entryPrice) {
        issues.push("For Long, Take Profit price must be higher than Entry Price.");
        invalidFields.takeProfitValue = true;
      }

      if (stopLossPrice >= entryPrice) {
        issues.push("For Long, Stop Loss price must be lower than Entry Price.");
        invalidFields.stopLossValue = true;
      }
    } else {
      if (takeProfitPrice >= entryPrice) {
        issues.push("For Short, Take Profit price must be lower than Entry Price.");
        invalidFields.takeProfitValue = true;
      }

      if (stopLossPrice <= entryPrice) {
        issues.push("For Short, Stop Loss price must be higher than Entry Price.");
        invalidFields.stopLossValue = true;
      }
    }
  }

  if (issues.length === 0 && getEffectiveRiskPercent(form) <= 0) {
    issues.push("Effective risk must be greater than 0 after fees and stop loss distance.");
    invalidFields.stopLossValue = true;
  }

  return { issues, invalidFields };
}

export function calculatePositionRiskMargin(form: PositionRiskMarginFormState): PositionRiskMarginValues | null {
  const validation = getValidation(form);
  if (validation.issues.length > 0) return null;

  const accountSize = toNumber(form.accountSize);
  const riskPercent = toNumber(form.riskPercent);
  const positionSize = toNumber(form.positionSize);
  const leverage = toNumber(form.leverage);
  const maintenanceMarginRatePercent = toNumber(form.maintenanceMarginRate);
  const entryFeePercent = toNumber(form.entryFeeRate);
  const exitFeePercent = toNumber(form.exitFeeRate);
  const maintenanceMarginRate = maintenanceMarginRatePercent / 100;
  const entryFeeRate = entryFeePercent / 100;
  const exitFeeRate = exitFeePercent / 100;
  const { entryPrice, takeProfitPrice, stopLossPrice } = getResolvedPrices(form);
  const positionUnits = positionSize / entryPrice;
  const marginSize = positionSize / leverage;
  const entryFee = positionSize * entryFeeRate;
  const exitNotionalAtTakeProfit = positionUnits * takeProfitPrice;
  const exitNotionalAtStopLoss = positionUnits * stopLossPrice;
  const exitFeeAtTakeProfit = exitNotionalAtTakeProfit * exitFeeRate;
  const exitFeeAtStopLoss = exitNotionalAtStopLoss * exitFeeRate;
  const stopLossDistancePercent =
    form.direction === "long"
      ? ((entryPrice - stopLossPrice) / entryPrice) * 100
      : ((stopLossPrice - entryPrice) / entryPrice) * 100;
  const grossProfitAtTakeProfit =
    form.direction === "long"
      ? positionUnits * (takeProfitPrice - entryPrice)
      : positionUnits * (entryPrice - takeProfitPrice);
  const netProfitAtTakeProfit = grossProfitAtTakeProfit - entryFee - exitFeeAtTakeProfit;
  const grossLossAtStopLoss =
    form.direction === "long"
      ? positionUnits * (entryPrice - stopLossPrice)
      : positionUnits * (stopLossPrice - entryPrice);
  const netLossAtStopLoss = grossLossAtStopLoss + entryFee + exitFeeAtStopLoss;
  const breakEvenPrice =
    form.direction === "long"
      ? (entryPrice * (1 + entryFeeRate)) / (1 - exitFeeRate)
      : (entryPrice * (1 - entryFeeRate)) / (1 + exitFeeRate);
  const estimatedLiquidationPrice =
    form.direction === "long"
      ? entryPrice * (1 - 1 / leverage + maintenanceMarginRate)
      : entryPrice * (1 + 1 / leverage - maintenanceMarginRate);

  return {
    direction: form.direction,
    accountSize,
    riskPercent,
    riskAmount: accountSize * (riskPercent / 100),
    positionSize,
    leverage,
    maintenanceMarginRatePercent,
    entryFeePercent,
    exitFeePercent,
    maintenanceMarginRate,
    entryFeeRate,
    exitFeeRate,
    entryPrice,
    takeProfitPrice,
    stopLossPrice,
    stopLossDistancePercent,
    positionUnits,
    marginSize,
    entryFee,
    exitFeeAtTakeProfit,
    exitFeeAtStopLoss,
    grossProfitAtTakeProfit,
    netProfitAtTakeProfit,
    grossLossAtStopLoss,
    netLossAtStopLoss,
    rewardRiskRatio: netLossAtStopLoss > 0 ? netProfitAtTakeProfit / netLossAtStopLoss : 0,
    breakEvenPrice,
    estimatedLiquidationPrice
  };
}

export function getWarnings(values: PositionRiskMarginValues | null) {
  if (!values) return [];

  const warnings = [
    values.riskPercent > 5 ? "Risk % is greater than 5%." : "",
    values.leverage > 25 ? "Leverage is greater than 25x." : "",
    values.positionSize / values.accountSize > 10
      ? "Position Size is extremely large compared to Account Size."
      : "",
    Math.abs(values.netLossAtStopLoss - values.riskAmount) > 0.02
      ? "Net Loss at SL does not match selected Risk USDT due to rounding."
      : ""
  ];

  if (values.direction === "long" && values.estimatedLiquidationPrice >= values.stopLossPrice) {
    warnings.push("Estimated liquidation price is above or equal to Stop Loss. Liquidation may happen before SL.");
  }

  if (values.direction === "short" && values.estimatedLiquidationPrice <= values.stopLossPrice) {
    warnings.push("Estimated liquidation price is below or equal to Stop Loss. Liquidation may happen before SL.");
  }

  return warnings.filter(Boolean);
}

export function getCopySummary(values: PositionRiskMarginValues) {
  return [
    `Direction: ${values.direction === "long" ? "Long" : "Short"}`,
    `Account Size: ${formatMoney(values.accountSize)}`,
    `Risk: ${formatPercent(values.riskPercent)}`,
    `Risk USDT including fees: ${formatMoney(values.riskAmount)}`,
    `Entry: ${formatNumber(values.entryPrice, 8)}`,
    `TP: ${formatNumber(values.takeProfitPrice, 8)}`,
    `SL: ${formatNumber(values.stopLossPrice, 8)}`,
    `Leverage: ${formatNumber(values.leverage, 2)}x`,
    `Position Size: ${formatMoney(values.positionSize)}`,
    `Units: ${formatUnits(values.positionUnits)}`,
    `Margin: ${formatMoney(values.marginSize)}`,
    `Gross Profit: ${formatMoney(values.grossProfitAtTakeProfit)}`,
    `Net Profit: ${formatMoney(values.netProfitAtTakeProfit)}`,
    `Gross Loss: ${formatMoney(values.grossLossAtStopLoss)}`,
    `Net Loss: ${formatMoney(values.netLossAtStopLoss)}`,
    `R:R: ${formatNumber(values.rewardRiskRatio, 2, 2)}`,
    `BE after fees: ${formatNumber(values.breakEvenPrice, 8)}`,
    `Est. Liquidation Price: ${formatNumber(values.estimatedLiquidationPrice, 8)}`
  ].join("\n");
}
