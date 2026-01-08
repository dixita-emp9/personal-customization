import { useLoaderData } from 'react-router';
import { useState } from 'react';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import { ProductPrice } from '~/components/ProductPrice';
import { ProductImage } from '~/components/ProductImage';
import { ProductForm } from '~/components/ProductForm';
import { redirectIfHandleIsLocalized } from '~/lib/redirect';
import { ProductCustomizer } from '~/components/ProductCustomizer/ProductCustomizer';

/**
 * @type {Route.MetaFunction}
 */
export const meta = ({ data }) => {
  return [
    { title: `Hydrogen | ${data?.product.title ?? ''}` },
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return { ...deferredData, ...criticalData };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {Route.LoaderArgs}
 */
async function loadCriticalData({ context, params, request }) {
  const { handle } = params;
  const { storefront } = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [
    { product },
    { collection: lettersCollection },
    { collection: patchesCollection },
    { product: embroideryProduct },
    { product: cricutProduct }
  ] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: { handle, selectedOptions: getSelectedProductOptions(request) },
    }),
    storefront.query(COLLECTION_QUERY, {
      variables: { handle: 'letters' }
    }),
    storefront.query(COLLECTION_QUERY, {
      variables: { handle: 'patches' }
    }),
    storefront.query(PRODUCT_QUERY, {
      variables: { handle: 'large-embroidery', selectedOptions: [] } // 'large-embroidery' from URL
    }),
    storefront.query(PRODUCT_QUERY, {
      variables: { handle: 'cricut', selectedOptions: [] } // 'cricut' from URL
    }),
  ]);

  if (!product?.id) {
    throw new Response(null, { status: 404 });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, { handle, data: product });

  return {
    product,
    lettersCollection,
    patchesCollection,
    embroideryProduct,
    cricutProduct
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {Route.LoaderArgs}
 */
function loadDeferredData({ context, params }) {
  return {};
}

export default function Product() {
  /** @type {LoaderReturnData} */
  const { product, lettersCollection, patchesCollection, embroideryProduct, cricutProduct } = useLoaderData();
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const { title, descriptionHtml } = product;

  const isPersonalisable = product.personalisable?.value === 'true';

  if (isCustomizing && isPersonalisable) {
    return (
      <div className="product-customizer-page">
        <div className="p-4 border-b">
          <button
            onClick={() => setIsCustomizing(false)}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2"
          >
            ← Back to Product Details
          </button>
        </div>
        <ProductCustomizer
          product={product}
          variants={product.variants}
          selectedVariant={selectedVariant}
          lettersCollection={lettersCollection}
          patchesCollection={patchesCollection}
          embroideryProduct={embroideryProduct}
          cricutProduct={cricutProduct}
        />
      </div>
    );
  }

  return (
    <div className="product">
      <ProductImage image={selectedVariant?.image} />
      <div className="product-main">
        <h1>{title}</h1>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />

        {/* Personalization Trigger - Only Show if Eligible */}
        {isPersonalisable && (
          <div className="my-6 p-6 bg-pink-50 border border-pink-100 rounded-xl text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Want to customize this?</h3>
            <p className="text-gray-600 mb-4 text-sm">Add letters, patches, embroidery, and more!</p>
            <button
              onClick={() => setIsCustomizing(true)}
              className="w-full py-3 px-6 bg-pink-500 text-white font-bold rounded-full hover:bg-pink-600 transition-all shadow-lg shadow-pink-200"
            >
              ✨ Get Personalized
            </button>
          </div>
        )}

        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
        <br />
        <br />
        <p>
          <strong>Description</strong>
        </p>
        <br />
        <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
        <br />
      </div>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
    variants(first: 250) {
      nodes {
        ...ProductVariant
      }
    }
    personalisable: metafield(namespace: "tht", key: "personalisable") {
      value
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;

const COLLECTION_QUERY = `#graphql
  query Collection($handle: String!) {
    collection(handle: $handle) {
      id
      title
      products(first: 250) {
        nodes {
          id
          title
          handle
          variants(first: 50) {
             nodes {
                id
                title
                image {
                   url
                }
                price {
                   amount
                }
                selectedOptions {
                   name
                   value
                }
             }
          }
        }
      }
    }
  }
`;

/** @typedef {import('./+types/products.$handle').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
