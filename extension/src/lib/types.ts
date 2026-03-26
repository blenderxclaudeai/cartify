export interface ProductData {
  product_url: string;
  product_title: string;
  product_image: string;
  product_category?: string;
  product_price?: string;
  retailer_domain?: string;
}

export interface TryOnResponse {
  ok: boolean;
  tryOnId?: string;
  resultImageUrl?: string;
  error?: string;
  missingPhoto?: string;
}

// ── Message types ──

export interface AuthLoginMessage {
  type: "AUTH_LOGIN";
  provider: "google" | "apple";
}

export interface AuthLogoutMessage {
  type: "AUTH_LOGOUT";
}

export interface AuthGetUserMessage {
  type: "AUTH_GET_USER";
}

export interface AuthRefreshMessage {
  type: "AUTH_REFRESH";
}

export interface ProductDetectedMessage {
  type: "PRODUCT_DETECTED";
  payload: ProductData;
}

export interface TryOnMessage {
  type: "CARTIFY_TRYON_REQUEST";
  payload: ProductData;
  background?: boolean;
}

export interface AddToCartMessage {
  type: "CARTIFY_ADD_TO_CART";
  payload: ProductData;
}

export interface SaveProductMessage {
  type: "CARTIFY_SAVE_PRODUCT";
  payload: ProductData;
}

export interface AddToRetailerCartMessage {
  type: "CARTIFY_ADD_TO_RETAILER_CART";
  payload: {
    product_url: string;
    retailer_domain?: string;
  };
}

export interface CheckCouponsMessage {
  type: "CARTIFY_CHECK_COUPONS";
  domain: string;
}

export type ExtensionMessage =
  | AuthLoginMessage
  | AuthLogoutMessage
  | AuthGetUserMessage
  | AuthRefreshMessage
  | ProductDetectedMessage
  | TryOnMessage
  | AddToCartMessage
  | AddToRetailerCartMessage
  | SaveProductMessage
  | CheckCouponsMessage;
