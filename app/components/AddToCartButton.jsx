import { CartForm } from '@shopify/hydrogen';
import { useEffect } from 'react';

/**
 * @param {{
 *   analytics?: unknown;
 *   children: React.ReactNode;
 *   disabled?: boolean;
 *   lines: Array<OptimisticCartLineInput>;
 *   onClick?: () => void;
 *   redirectTo?: string;
 * }}
 */
export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  redirectTo
}) {
  return (
    <CartForm route="/cart" inputs={{ lines }} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher) => (
        <CartFormContent
          fetcher={fetcher}
          analytics={analytics}
          disabled={disabled}
          onClick={onClick}
          redirectTo={redirectTo}
        >
          {children}
        </CartFormContent>
      )}
    </CartForm>
  );
}

function CartFormContent({ fetcher, analytics, disabled, onClick, redirectTo, children }) {
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && redirectTo) {
      window.location.href = redirectTo;
    }
  }, [fetcher.state, fetcher.data, redirectTo]);

  return (
    <>
      <input
        name="analytics"
        type="hidden"
        value={JSON.stringify(analytics)}
      />
      <button
        type="submit"
        onClick={onClick}
        disabled={disabled ?? fetcher.state !== 'idle'}
      >
        {children}
      </button>
    </>
  );
}

/** @typedef {import('react-router').FetcherWithComponents} FetcherWithComponents */
/** @typedef {import('@shopify/hydrogen').OptimisticCartLineInput} OptimisticCartLineInput */
