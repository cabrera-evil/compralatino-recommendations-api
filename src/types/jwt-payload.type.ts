export type JWTPayload = {
	id?: string;
	iat?: number;
	exp?: number;
};

export type AuthUser = {
	id: number;
};
