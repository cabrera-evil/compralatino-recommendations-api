import { CATALOG_VALIDATE_PRODUCTS_PATTERN } from '@/constants/catalog-rpc';
import { RABBITMQ_SERVICE } from '@/constants/rabbitmq';
import {
	Inject,
	Injectable,
	Logger,
	Optional,
	ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
	CatalogProduct,
	CatalogProductReply,
	CatalogValidateReply,
	CatalogValidateRequest,
} from './catalog-product.type';

const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const DEFAULT_TIMEOUT_MS = 5000;

/** Request/reply to catalog-api over RabbitMQ; the only way recommendations-api reads product data. */
@Injectable()
export class CatalogClientService {
	private readonly logger = new Logger(CatalogClientService.name);

	constructor(
		@Optional()
		@Inject(RABBITMQ_SERVICE)
		private readonly client?: ClientProxy
	) {}

	/** Returns the found and available products keyed by code; throws 503 if catalog is unreachable. */
	async getAvailable(codes: string[]): Promise<Map<string, CatalogProduct>> {
		const reply = await this.request([...new Set(codes)]);
		const products = new Map<string, CatalogProduct>();
		for (const item of reply.items) {
			const product = this.toProduct(item);
			if (product) products.set(product.code, product);
		}
		return products;
	}

	private async request(codes: string[]): Promise<CatalogValidateReply> {
		if (!this.client) throw this.unavailable('RabbitMQ is disabled');
		const ms = Number(process.env.CATALOG_RPC_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
		try {
			const reply = await firstValueFrom(
				this.client
					.send<
						CatalogValidateReply,
						CatalogValidateRequest
					>(CATALOG_VALIDATE_PRODUCTS_PATTERN, { codes })
					.pipe(timeout(ms))
			);
			if (!Array.isArray(reply?.items))
				throw new Error('Malformed catalog reply');
			return reply;
		} catch (error) {
			throw this.unavailable(
				error instanceof Error ? error.message : String(error)
			);
		}
	}

	private unavailable(reason: string) {
		this.logger.warn(`catalog request failed: ${reason}`);
		return new ServiceUnavailableException('CATALOG_UNAVAILABLE');
	}

	private toProduct(item: CatalogProductReply): CatalogProduct | null {
		if (
			!item?.found ||
			!item.available ||
			!item.title ||
			!item.endsAt ||
			Number.isNaN(Date.parse(item.endsAt)) ||
			!DECIMAL_PATTERN.test(item.price?.usd ?? '') ||
			!DECIMAL_PATTERN.test(item.price?.jpy ?? '')
		)
			return null;
		const { code, name } = item.category ?? {};
		return {
			code: item.code,
			title: item.title,
			endsAt: item.endsAt,
			price: {
				usd: item.price.usd,
				jpy: item.price.jpy,
				exchangedAt: item.price.exchangedAt ?? null,
			},
			category: code && name ? { code, name } : null,
		};
	}
}
