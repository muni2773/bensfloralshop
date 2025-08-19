import {
  addItemToOrder,
  adjustOrderLine,
  getActiveOrder,
  removeOrderLine,
  setCustomerForOrder,
} from '~/providers/orders/order';
import { DataFunctionArgs, json } from '@remix-run/server-runtime';
import {
  CreateCustomerInput,
  ErrorCode,
  ErrorResult,
  OrderDetailFragment,
} from '~/generated/graphql';
import { getSessionStorage } from '~/sessions';

export type CartLoaderData = Awaited<ReturnType<typeof loader>>;

export async function loader({ request }: DataFunctionArgs) {
  return {
    activeOrder: await getActiveOrder({ request }),
  };
}

export async function action({ request, params }: DataFunctionArgs) {
  const body = await request.formData();
  const formAction = body.get('action');
  let activeOrder: OrderDetailFragment | undefined = undefined;
  let error: ErrorResult = {
    errorCode: ErrorCode.NoActiveOrderError,
    message: '',
  };
  switch (formAction) {
    case 'setOrderCustomer': {
      const customerData = Object.fromEntries<any>(
        body.entries(),
      ) as CreateCustomerInput;
      const result = await setCustomerForOrder(
        {
          emailAddress: customerData.emailAddress,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
        },
        { request },
      );
      if (result.setCustomerForOrder.__typename === 'Order') {
        activeOrder = result.setCustomerForOrder;
      } else {
        error = result.setCustomerForOrder;
      }
      break;
    }
    case 'removeItem': {
      const lineId = body.get('lineId');
      const result = await removeOrderLine(lineId?.toString() ?? '', {
        request,
      });
      if (result.removeOrderLine.__typename === 'Order') {
        activeOrder = result.removeOrderLine;
      } else {
        error = result.removeOrderLine;
      }
      break;
    }
    case 'adjustItem': {
      const lineId = body.get('lineId');
      const quantity = body.get('quantity');
      if (lineId && quantity != null) {
        const result = await adjustOrderLine(lineId?.toString(), +quantity, {
          request,
        });
        if (result.adjustOrderLine.__typename === 'Order') {
          activeOrder = result.adjustOrderLine;
        } else {
          error = result.adjustOrderLine;
        }
      }
      break;
    }
    case 'addItemToOrder': {
      const variantId = body.get('variantId')?.toString();
      const quantity = Number(body.get('quantity')?.toString() ?? 1);
      if (!variantId || !(quantity > 0)) {
        throw new Error(
          `Invalid input: variantId ${variantId}, quantity ${quantity}`,
        );
      }
      const result = await addItemToOrder(variantId, quantity, {
        request,
      });
      if (result.addItemToOrder.__typename === 'Order') {
        activeOrder = result.addItemToOrder;
      } else {
        error = result.addItemToOrder;
      }
      break;
    }
    case 'addPaymentToOrder': {
    }
    default:
    // Don't do anything
  }
  let headers: ResponseInit['headers'] = {};
  const sessionStorage = await getSessionStorage();
  const session = await sessionStorage.getSession(
    request?.headers.get('Cookie'),
  );
  session.flash('activeOrderError', error);
  headers = {
    'Set-Cookie': await sessionStorage.commitSession(session),
  };
  return json(
    { activeOrder: activeOrder || (await getActiveOrder({ request })) },
    {
      headers,
    },
  );
}
