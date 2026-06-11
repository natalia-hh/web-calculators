export type AddMode = "quantity" | "notional";

export type PositionAverageFormState = {
  currentQuantity: string;
  currentAveragePrice: string;
  averagingPrice: string;
  additionalQuantity: string;
  additionalNotional: string;
  leverage: string;
  addMode: AddMode;
};
