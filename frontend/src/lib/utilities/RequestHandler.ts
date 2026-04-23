export default class RequestHandler {
	static mode = import.meta.env.VITE_MODE;

	static baseURL =
		RequestHandler.mode === "development"
			? import.meta.env.VITE_DEVELOPMENT_URL ?? "http://localhost:5000"
			: RequestHandler.mode === "production"
				? import.meta.env.VITE_PRODUCTION_URL ?? "http://localhost:5000"
				: RequestHandler.mode === "deployed"
					? import.meta.env.VITE_DEPLOYED_URL ?? ""
					: "http://localhost:5000";

	static apiLink = "api/sentiment";
	static init() {
		const token = import.meta.env.VITE_API_ACCESS;

		if (token && typeof window !== "undefined") {
			localStorage.setItem("authAccess", token);
		}
	}

	static async fetchData(
		method: string,
		link: string,
		requestData: Record<string, any> | FormData = {},
		headers: Record<string, string> = {},
		callback: ((error: string | null, data?: any) => void) | null = null
	) {
		const url = `${RequestHandler.baseURL}/${RequestHandler.apiLink}/${link}`;

		const options: RequestInit = {
			method: method.toUpperCase(),
		};

		const isClient = typeof window !== "undefined";
		const authToken = isClient ? localStorage.getItem("authToken") : null;
		const authAccess = isClient ? localStorage.getItem("authAccess") : null;

		if (authToken) {
			headers["Authorization"] = `Bearer ${authToken}`;
		}

		if (authAccess) {
			headers["X-Auth-Token"] = `Bearer ${authAccess}`;
		}

		const isFormData = requestData instanceof FormData;

		if (!isFormData) {
			options.headers = {
				"Content-Type": "application/json",
				...headers,
			};

			if (!["get", "head"].includes(method.toLowerCase())) {
				options.body = JSON.stringify(requestData);
			}
		} else {
			options.headers = { ...headers };
			options.body = requestData;
		}

		try {
			const response = await fetch(url, options);
			const responseData = await response.json();

			if (!response.ok) {
				throw new Error(
					responseData.message || `HTTP error! Status: ${response.status}`
				);
			}

			if (callback) callback(null, responseData);

			return responseData;
		} catch (error: any) {
			console.error("Fetch error:", error);

			if (callback) {
				callback(
					error.message || "Something went wrong. Please try again later.",
					undefined
				);
			}

			return {
				success: false,
				message: error.message || "An error occurred",
				baseURL: RequestHandler.baseURL,
				url,
			};
		}
	}
}