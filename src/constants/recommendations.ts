export const MAX_RECOMMENDATION_PAGE_SIZE = 50;
export const MAX_HISTORY_CODES = 200;
// Catalog validate accepts at most 50 codes per call: history sample + candidates.
export const HISTORY_ENRICH_LIMIT = 10;
export const CANDIDATE_LIMIT = 40;
export const EXCLUDED_ORDER_STATUSES = ['cancelled', 'failed'];
export const MAX_CO_PURCHASE_ORDERS = 1000;
// Request/reply contract served to admin-api (RabbitMQ only).
export const RECOMMENDATIONS_PURCHASE_MATCH_PATTERN =
	'recommendations.admin.purchaseMatch';
export const PURCHASE_MATCH_MAX_ORDERS = 50;
// Max per-order rank() calls in flight (each hits the DB and the catalog).
export const PURCHASE_MATCH_CONCURRENCY = 5;
