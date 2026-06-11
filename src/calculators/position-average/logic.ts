import type { AddMode, PositionAverageFormState } from "./types";

export const initialState: PositionAverageFormState = {
  currentQuantity: "78",
  currentAveragePrice: "87.51",
  averagingPrice: "91.49",
  additionalQuantity: "40",
  additionalNotional: "3660",
  leverage: "5",
  addMode: "quantity"
};

export const emptyState: PositionAverageFormState = {
  currentQuantity: "",
  currentAveragePrice: "",
  averagingPrice: "",
  additionalQuantity: "",
  additionalNotional: "",
  leverage: "",
  addMode: "quantity"
};

export const toNumber = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const formatNumber = (value: number, maximumFractionDigits = 0) => {
  if (!Number.isFinite(value)) return "0";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(value);
};

export const formatMoney = (value: number) => `${formatNumber(value, 0)} USDT`;
export const formatPrice = (value: number, maximumFractionDigits = 2) =>
  `${formatNumber(value, maximumFractionDigits)} USDT`;
export const formatQuantity = (value: number, maximumFractionDigits = 2) =>
  formatNumber(value, maximumFractionDigits);

export const numberInputValue = (value: number, maximumFractionDigits = 4) => {
  if (!Number.isFinite(value) || value === 0) return "";
  return value.toFixed(maximumFractionDigits).replace(/\.?0+$/, "");
};

export function calculatePositionAverage(form: PositionAverageFormState) {
  const currentQuantity = Math.max(0, toNumber(form.currentQuantity));
  const currentAveragePrice = toNumber(form.currentAveragePrice);
  const averagingPrice = toNumber(form.averagingPrice);
  const leverage = toNumber(form.leverage);
  const priceIsValid = currentAveragePrice > 0 && averagingPrice > 0;
  const leverageIsValid = leverage > 0;
  const currentNotional = currentAveragePrice > 0 ? currentQuantity * currentAveragePrice : 0;
  const currentMarketValue = averagingPrice > 0 ? currentQuantity * averagingPrice : 0;
  const hasAddInput =
    form.addMode === "quantity"
      ? form.additionalQuantity.trim() !== ""
      : form.additionalNotional.trim() !== "";

  const additionalQuantity =
    hasAddInput && averagingPrice > 0
      ? form.addMode === "quantity"
        ? Math.max(0, toNumber(form.additionalQuantity))
        : Math.max(0, toNumber(form.additionalNotional)) / averagingPrice
      : 0;

  const additionalNotional =
    hasAddInput && averagingPrice > 0
      ? form.addMode === "quantity"
        ? additionalQuantity * averagingPrice
        : Math.max(0, toNumber(form.additionalNotional))
      : 0;

  const newTotalQuantity = currentQuantity + additionalQuantity;
  const newTotalNotional = currentNotional + additionalNotional;
  const newAveragePrice =
    priceIsValid && newTotalQuantity > 0
      ? (currentQuantity * currentAveragePrice + additionalQuantity * averagingPrice) /
        newTotalQuantity
      : 0;
  const marginToAdd = leverageIsValid ? additionalNotional / leverage : 0;
  const finalMargin = leverageIsValid ? newTotalNotional / leverage : 0;
  const averageDifference = currentAveragePrice > 0 ? newAveragePrice - currentAveragePrice : 0;
  const averageChangePercent =
    currentAveragePrice > 0 ? (averageDifference / currentAveragePrice) * 100 : 0;

  return {
    currentQuantity,
    currentAveragePrice,
    averagingPrice,
    leverage,
    currentNotional,
    currentMarketValue,
    additionalQuantity,
    additionalNotional,
    newTotalQuantity,
    newTotalNotional,
    newAveragePrice,
    marginToAdd,
    finalMargin,
    averageDifference,
    averageChangePercent
  };
}

export function getValidationIssues(form: PositionAverageFormState) {
  return [
    form.currentQuantity !== "" && toNumber(form.currentQuantity) < 0
      ? "Current quantity must be 0 or greater."
      : "",
    form.currentAveragePrice !== "" && toNumber(form.currentAveragePrice) <= 0
      ? "Current average entry price must be greater than 0."
      : "",
    form.averagingPrice !== "" && toNumber(form.averagingPrice) <= 0
      ? "Market or averaging price must be greater than 0."
      : "",
    form.leverage !== "" && toNumber(form.leverage) <= 0 ? "Leverage must be greater than 0." : "",
    form.additionalQuantity !== "" && toNumber(form.additionalQuantity) < 0
      ? "Additional quantity must be 0 or greater."
      : "",
    form.additionalNotional !== "" && toNumber(form.additionalNotional) < 0
      ? "Additional notional must be 0 or greater."
      : ""
  ].filter(Boolean);
}

export function getNextFormState(
  current: PositionAverageFormState,
  field: keyof PositionAverageFormState,
  value: string
) {
  const next = { ...current, [field]: value };
  const price = toNumber(next.averagingPrice);

  if ((field === "additionalQuantity" || field === "averagingPrice") && next.addMode === "quantity") {
    const quantity = Math.max(0, toNumber(next.additionalQuantity));
    next.additionalNotional =
      next.additionalQuantity.trim() === "" || price <= 0 ? "" : String(quantity * price);
  }

  if ((field === "additionalNotional" || field === "averagingPrice") && next.addMode === "notional") {
    const notional = Math.max(0, toNumber(next.additionalNotional));
    next.additionalQuantity =
      next.additionalNotional.trim() === "" || price <= 0 ? "" : String(notional / price);
  }

  return next;
}

export function getNextModeState(current: PositionAverageFormState, mode: AddMode) {
  const price = toNumber(current.averagingPrice);
  const next = { ...current, addMode: mode };

  if (mode === "quantity") {
    const quantity = Math.max(0, toNumber(current.additionalQuantity));
    next.additionalNotional =
      current.additionalQuantity.trim() === "" || price <= 0 ? "" : String(quantity * price);
  } else {
    const notional = Math.max(0, toNumber(current.additionalNotional));
    next.additionalQuantity =
      current.additionalNotional.trim() === "" || price <= 0 ? "" : String(notional / price);
  }

  return next;
}
