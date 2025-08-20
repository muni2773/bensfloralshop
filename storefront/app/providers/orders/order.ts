import gql from 'graphql-tag';
import { QueryOptions, sdk } from '../../graphqlWrapper';
import { CreateCustomerInput } from '~/generated/graphql';

export function getActiveOrder(options: QueryOptions) {
  return sdk
    .activeOrder(undefined, options)
    .then(({ activeOrder }) => activeOrder);
}

export function getOrderByCode(code: string, options: QueryOptions) {
  return sdk
    .orderByCode({ code }, options)
    .then(({ orderByCode }) => orderByCode);
}

export function addItemToOrder(
  productVariantId: string,
  quantity: number,
  options: QueryOptions,
) {
  return sdk.addItemToOrder(
    {
      productVariantId,
      quantity,
    },
    options,
  );
}

export function removeOrderLine(lineId: string, options: QueryOptions) {
  return sdk.removeOrderLine({ orderLineId: lineId }, options);
}

export function adjustOrderLine(
  lineId: string,
  quantity: number,
  options: QueryOptions,
) {
  return sdk.adjustOrderLine({ orderLineId: lineId, quantity }, options);
}

export function setCustomerForOrder(
  input: CreateCustomerInput,
  options: QueryOptions,
) {
  return sdk.setCustomerForOrder({ input }, options);
}

gql`
  mutation setCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      ...OrderDetail
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

gql`
  mutation addPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ...OrderDetail
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

gql`
  mutation addItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ...OrderDetail
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

gql`
  mutation removeOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ...OrderDetail
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

gql`
  mutation adjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      ...OrderDetail
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

gql`
  fragment OrderDetail on Order {
    __typename
    id
    code
    active
    createdAt
    state
    currencyCode
    totalQuantity
    subTotal
    subTotalWithTax
    taxSummary {
      description
      taxRate
      taxTotal
    }
    shippingWithTax
    totalWithTax
    customer {
      id
      firstName
      lastName
      emailAddress
    }
    lines {
      id
      unitPriceWithTax
      linePriceWithTax
      quantity
      featuredAsset {
        id
        preview
      }
      productVariant {
        id
        name
        price
        product {
          id
          slug
        }
      }
    }
    payments {
      id
      state
      method
      amount
      metadata
    }
  }
`;

gql`
  query activeOrder {
    activeOrder {
      ...OrderDetail
    }
  }
`;

gql`
  query orderByCode($code: String!) {
    orderByCode(code: $code) {
      ...OrderDetail
    }
  }
`;
