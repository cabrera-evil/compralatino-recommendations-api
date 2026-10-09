export type CatalogValidateRequest = { codes: string[] };

export type CatalogCategory = { code: string; name: string };

export type CatalogProductReply = {
	code: string;
	found: boolean;
	available: boolean;
	title?: string;
	sellerName?: string;
	status?: string;
	endsAt?: string;
	price?: { usd: string; jpy: string; exchangedAt?: string | null };
	category?: CatalogCategory | null;
};

export type CatalogValidateReply = { items: CatalogProductReply[] };

export type CatalogProduct = {
	code: string;
	title: string;
	endsAt: string;
	price: { usd: string; jpy: string; exchangedAt: string | null };
	category: CatalogCategory | null;
};
