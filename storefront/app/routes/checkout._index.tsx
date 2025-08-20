import { FormEvent, useState } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import {
  Form,
  useLoaderData,
  useNavigate,
  useOutletContext,
} from '@remix-run/react';
import { OutletContext } from '~/types';
import { DataFunctionArgs, json, redirect } from '@remix-run/server-runtime';
import { getSessionStorage } from '~/sessions';
import { classNames } from '~/utils/class-names';
import { getActiveCustomerDetails } from '~/providers/customer/customer';
import { getActiveOrder } from '~/providers/orders/order';
import { useTranslation } from 'react-i18next';

export async function loader({ request }: DataFunctionArgs) {
  const session = await getSessionStorage().then((sessionStorage) =>
    sessionStorage.getSession(request?.headers.get('Cookie')),
  );

  const activeOrder = await getActiveOrder({ request });

  if (
    !session ||
    !activeOrder ||
    !activeOrder.active ||
    activeOrder.lines.length === 0
  ) {
    return redirect('/');
  }

  const { activeCustomer } = await getActiveCustomerDetails({ request });
  const error = session.get('activeOrderError');
  return json({
    activeCustomer,
    error,
  });
}

export default function CheckoutPickup() {
  const { activeCustomer, error } = useLoaderData<typeof loader>();
  const { activeOrderFetcher, activeOrder } = useOutletContext<OutletContext>();
  const [customerFormChanged, setCustomerFormChanged] = useState(false);
  let navigate = useNavigate();
  const { t } = useTranslation();

  const { customer } = activeOrder ?? {};
  const isSignedIn = !!activeCustomer?.id;
  const canProceedToPayment = customer && activeOrder?.lines?.length;

  const submitCustomerForm = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const { emailAddress, firstName, lastName } = Object.fromEntries<any>(
      formData.entries(),
    );
    const isValid = event.currentTarget.checkValidity();
    if (
      customerFormChanged &&
      isValid &&
      emailAddress &&
      firstName &&
      lastName
    ) {
      activeOrderFetcher.submit(formData, {
        method: 'post',
        action: '/api/active-order',
      });
      setCustomerFormChanged(false);
    }
  };

  const navigateToPayment = () => {
    navigate('/checkout/payment');
  };

  return (
    <div className="flex flex-col max-w-lg mx-auto">
      <div>
        <h2 className="text-lg font-medium text-gray-900">
          {t('checkout.detailsTitle')}
        </h2>
        {customer ? (
          <div className="mt-4 text-sm text-gray-700">
            <p>
              {customer.firstName} {customer.lastName}
            </p>
            <p>{customer?.emailAddress}</p>
          </div>
        ) : (
          <Form
            method="post"
            action="/api/active-order"
            onBlur={submitCustomerForm}
            onChange={() => setCustomerFormChanged(true)}
            hidden={isSignedIn}
          >
            <input type="hidden" name="action" value="setOrderCustomer" />
            <div className="mt-4">
              <label
                htmlFor="emailAddress"
                className="block text-sm font-medium text-gray-700"
              >
                {t('account.emailAddress')}
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  id="emailAddress"
                  name="emailAddress"
                  autoComplete="email"
                  defaultValue={customer?.emailAddress}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              {error?.errorCode === 'EMAIL_ADDRESS_CONFLICT_ERROR' && (
                <p className="mt-2 text-sm text-red-600" id="email-error">
                  {error.message}
                </p>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('account.firstName')}
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    autoComplete="given-name"
                    defaultValue={customer?.firstName}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('account.lastName')}
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    autoComplete="family-name"
                    defaultValue={customer?.lastName}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </Form>
        )}
      </div>

      <div className="mt-10 border-t border-gray-200 pt-10">
        <h2 className="text-lg font-medium text-gray-900">
          {t('checkout.pickupTitle')}
        </h2>
        <p className="mt-4 not-italic">{t('checkout.storeAddress')}</p>
        <p className="mt-2">{t('checkout.pickupInstructions')}</p>
      </div>

      <button
        type="button"
        disabled={!canProceedToPayment}
        onClick={navigateToPayment}
        className={classNames(
          canProceedToPayment
            ? 'bg-primary-600 hover:bg-primary-700'
            : 'bg-gray-400',
          'flex w-full items-center justify-center space-x-2 mt-24 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
        )}
      >
        <LockClosedIcon className="w-5 h-5"></LockClosedIcon>
        <span>{t('checkout.goToPayment')}</span>
      </button>
    </div>
  );
}
